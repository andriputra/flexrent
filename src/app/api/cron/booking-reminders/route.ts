import type { NextRequest } from "next/server"
import { Prisma } from "@prisma/client"
import { addDays, fromWib, toDayKey } from "@/lib/datetime"
import { prisma } from "@/lib/db"
import { isCronAuthorized, unauthorizedCron } from "@/lib/cron"
import { notifyBooking, type BookingNotificationKind } from "@/lib/notifications"

export const runtime = "nodejs"

const reminderSelect = {
  id: true,
  code: true,
  status: true,
  customerName: true,
  customerPhone: true,
  startsAt: true,
  endsAt: true,
  totalAmount: true,
  paidAmount: true,
  lateFee: true,
  vehicle: { select: { brand: true, model: true } },
  tenant: { select: { id: true, name: true, slug: true, phone: true } },
} satisfies Prisma.BookingSelect

type Scan = { scanned: number; sent: number; skipped: number }

/** Satu jenis pengingat; kunci dedupe membuat cron yang jalan dua kali aman. */
async function remind(kind: BookingNotificationKind, where: Prisma.BookingWhereInput): Promise<Scan> {
  const rows = await prisma.booking.findMany({
    where,
    select: reminderSelect,
    orderBy: { startsAt: "asc" },
    take: 300,
  })

  const result: Scan = { scanned: rows.length, sent: 0, skipped: 0 }
  for (const booking of rows) {
    const status = await notifyBooking({
      tenantId: booking.tenant.id,
      tenant: booking.tenant,
      bookingId: booking.id,
      kind,
      booking: {
        code: booking.code,
        status: booking.status,
        customerName: booking.customerName,
        customerPhone: booking.customerPhone,
        startsAt: booking.startsAt,
        endsAt: booking.endsAt,
        totalAmount: booking.totalAmount,
        paidAmount: booking.paidAmount,
        lateFee: booking.lateFee,
        vehicle: booking.vehicle,
      },
    })
    result[status === "SENT" ? "sent" : "skipped"] += 1
  }
  return result
}

/** Pengingat H-1 pengambilan, H-1 pengembalian, dan pemberitahuan keterlambatan harian. */
export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) return unauthorizedCron()

  const now = new Date()
  const startOfTomorrow = fromWib(toDayKey(addDays(now, 1)), "00:00")
  const dayAfterTomorrow = fromWib(toDayKey(addDays(now, 2)), "00:00")
  const tomorrow = { gte: startOfTomorrow, lt: dayAfterTomorrow }
  const active: Prisma.BookingWhereInput["status"] = { in: ["CONFIRMED", "ONGOING"] }

  return Response.json({
    ok: true,
    pickup: await remind("PICKUP_REMINDER", { status: "CONFIRMED", startsAt: tomorrow }),
    return: await remind("RETURN_REMINDER", { status: active, endsAt: tomorrow }),
    late: await remind("LATE_NOTICE", { status: active, endsAt: { lt: now } }),
  })
}
