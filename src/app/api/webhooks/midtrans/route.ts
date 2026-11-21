import { revalidatePath } from "next/cache"
import type { NextRequest } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { notifyBooking } from "@/lib/notifications"
import { applyInvoicePaymentEvent, applyPaymentEvent, isInvoiceOrder } from "@/lib/payments/apply"
import { getPaymentProvider } from "@/lib/payments/midtrans"

export const runtime = "nodejs"

function payloadOf(raw: string): Prisma.InputJsonValue {
  try {
    return JSON.parse(raw) as Prisma.InputJsonValue
  } catch {
    return { raw: raw.slice(0, 2000) }
  }
}

/**
 * Notifikasi status pembayaran Midtrans. Balasan harus 200 begitu event disimpan
 * atau diterapkan; 5xx membuat Midtrans mengirim ulang berkali-kali.
 */
export async function POST(request: NextRequest) {
  const provider = getPaymentProvider()
  if (!provider) return new Response("Pembayaran online tidak aktif.", { status: 403 })

  const raw = await request.text()
  const event = provider.parseEvent(raw, request.headers.get("signature"))
  if (!event) return new Response("Signature tidak valid.", { status: 403 })

  const eventId = `${event.transactionId || event.orderId}:${event.statusCode}:${event.outcome}`

  // Idempotensi: transaction_id + status yang sama hanya boleh diterapkan sekali.
  // Event yang pernah disimpan tapi gagal diproses (processedAt masih kosong)
  // boleh diterapkan ulang, karena Midtrans mengirim ulang setiap balasan non-2xx.
  let stored: { id: string }
  let retried = false
  try {
    stored = await prisma.webhookEvent.create({
      data: { provider: "midtrans", eventId, payload: payloadOf(raw) },
      select: { id: true },
    })
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error
    const previous = await prisma.webhookEvent.findUnique({
      where: { provider_eventId: { provider: "midtrans", eventId } },
      select: { id: true, processedAt: true },
    })
    if (!previous || previous.processedAt) return Response.json({ ok: true, deduped: true })
    stored = previous
    retried = true
  }

  // order_id "-I" menagih tagihan langganan, sisanya menagih booking.
  const invoiceMode = isInvoiceOrder(event.orderId)
  const booking = invoiceMode ? null : await applyPaymentEvent(event)
  const invoice = invoiceMode ? await applyInvoicePaymentEvent(event) : null

  await prisma.webhookEvent.update({
    where: { id: stored.id },
    data: { processedAt: new Date(), tenantId: invoice?.tenantId ?? booking?.tenantId ?? null },
  })

  if (invoice) revalidatePath("/dashboard/billing")

  if (booking) {
    revalidatePath(`/${booking.tenant.slug}/booking/${booking.code}`)
    revalidatePath("/dashboard/bookings")
    if (booking.becamePaid) {
      await notifyBooking({
        tenantId: booking.tenant.id,
        tenant: booking.tenant,
        bookingId: booking.bookingId,
        kind: "PAYMENT_SETTLED",
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
    }
  }

  return Response.json(retried ? { ok: true, retried: true } : { ok: true })
}
