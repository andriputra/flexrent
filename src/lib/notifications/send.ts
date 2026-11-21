import type { NotificationKind, NotificationStatus } from "@prisma/client"
import { prisma } from "@/lib/db"
import { normalizePhone } from "@/lib/format"
import { getWhatsAppNotifier } from "./notifier"
import { toInternationalPhone } from "./provider"
import { buildNotificationMessage, dedupeKeyFor, type NotifyBooking, type NotifyTenant } from "./templates"

export type NotifyRequest = {
  tenantId: string
  tenant: NotifyTenant
  bookingId?: string | null
  kind: NotificationKind
  booking: NotifyBooking
  /** Hari ini, supaya tes bisa memakai tanggal tetap untuk kunci dedupe. */
  today?: Date
}

/**
 * Kirim + catat sekali per (tenant, jenis, dedupeKey). Baris log yang sudah ada
 * selalu menang, jadi cron yang jalan dua kali sehari tidak mengirim ulang.
 * Pengiriman gagal tidak pernah melempar: pembayaran/cron tidak boleh ikut gagal.
 */
export async function notifyBooking(request: NotifyRequest): Promise<NotificationStatus> {
  const today = request.today ?? new Date()
  const local = normalizePhone(request.booking.customerPhone)
  const to = /^08\d{7,11}$/.test(local) ? toInternationalPhone(local) : ""
  const dedupeKey = dedupeKeyFor(request.kind, request.booking, today)

  if (!to) return "SKIPPED"

  const existing = await prisma.notificationLog.findUnique({
    where: { tenantId_kind_dedupeKey: { tenantId: request.tenantId, kind: request.kind, dedupeKey } },
    select: { id: true },
  })
  if (existing) return "SKIPPED"

  const notifier = getWhatsAppNotifier()
  let status: NotificationStatus = "FAILED"
  let detail: string | undefined

  try {
    const result = await notifier.send({ to, message: buildNotificationMessage(request.kind, request) })
    status = result.ok ? "SENT" : "FAILED"
    detail = result.detail
  } catch (error) {
    detail = error instanceof Error ? error.message : String(error)
  }

  await prisma.notificationLog
    .create({
      data: {
        tenantId: request.tenantId,
        bookingId: request.bookingId ?? null,
        kind: request.kind,
        to,
        dedupeKey,
        status,
        provider: notifier.id,
        detail: detail?.slice(0, 500) ?? null,
      },
    })
    .catch(() => undefined)

  return status
}
