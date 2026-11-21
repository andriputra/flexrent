import type { NotificationKind, NotificationStatus } from "@prisma/client"
import { prisma } from "@/lib/db"
import { normalizePhone } from "@/lib/format"
import { getWhatsAppNotifier } from "./notifier"
import { toInternationalPhone } from "./provider"
import {
  buildNotificationMessage,
  dedupeKeyFor,
  subscriptionDedupeKey,
  subscriptionReminderMessage,
  type BookingNotificationKind,
  type NotifyBooking,
  type NotifySubscription,
  type NotifyTenant,
} from "./templates"

/** Nomor tujuan hanya dipakai kalau bentuknya 08…; selain itu pesan dilewati. */
function recipientOf(phone: string): string {
  const local = normalizePhone(phone)
  return /^08\d{7,11}$/.test(local) ? toInternationalPhone(local) : ""
}

type Delivery = {
  tenantId: string
  bookingId?: string | null
  kind: NotificationKind
  to: string
  dedupeKey: string
  message: string
}

/**
 * Kirim + catat sekali per (tenant, jenis, dedupeKey). Baris log yang sudah ada
 * selalu menang, jadi cron yang jalan dua kali sehari tidak mengirim ulang.
 * Pengiriman gagal tidak pernah melempar: pembayaran/cron tidak boleh ikut gagal.
 */
async function deliver(args: Delivery): Promise<NotificationStatus> {
  if (!args.to) return "SKIPPED"

  const existing = await prisma.notificationLog.findUnique({
    where: { tenantId_kind_dedupeKey: { tenantId: args.tenantId, kind: args.kind, dedupeKey: args.dedupeKey } },
    select: { id: true },
  })
  if (existing) return "SKIPPED"

  const notifier = getWhatsAppNotifier()
  let status: NotificationStatus = "FAILED"
  let detail: string | undefined

  try {
    const result = await notifier.send({ to: args.to, message: args.message })
    status = result.ok ? "SENT" : "FAILED"
    detail = result.detail
  } catch (error) {
    detail = error instanceof Error ? error.message : String(error)
  }

  await prisma.notificationLog
    .create({
      data: {
        tenantId: args.tenantId,
        bookingId: args.bookingId ?? null,
        kind: args.kind,
        to: args.to,
        dedupeKey: args.dedupeKey,
        status,
        provider: notifier.id,
        detail: detail?.slice(0, 500) ?? null,
      },
    })
    .catch(() => undefined)

  return status
}

export type NotifyRequest = {
  tenantId: string
  tenant: NotifyTenant
  bookingId?: string | null
  kind: BookingNotificationKind
  booking: NotifyBooking
  /** Hari ini, supaya tes bisa memakai tanggal tetap untuk kunci dedupe. */
  today?: Date
}

/** Pengingat atau konfirmasi ke nomor WhatsApp pelanggan. */
export async function notifyBooking(request: NotifyRequest): Promise<NotificationStatus> {
  return deliver({
    tenantId: request.tenantId,
    bookingId: request.bookingId ?? null,
    kind: request.kind,
    to: recipientOf(request.booking.customerPhone),
    dedupeKey: dedupeKeyFor(request.kind, request.booking, request.today ?? new Date()),
    message: buildNotificationMessage(request.kind, request),
  })
}

export type NotifySubscriptionRequest = {
  tenantId: string
  tenant: NotifyTenant
  /** Tagihan yang berjalan; tanpa nomor, kunci dedupe memakai tanggal jatuh tempo. */
  invoiceNumber: string | null
  subscription: NotifySubscription
}

/** Pengingat perpanjangan dan surat telat bayar ke nomor WhatsApp rental. */
export async function notifySubscription(request: NotifySubscriptionRequest): Promise<NotificationStatus> {
  return deliver({
    tenantId: request.tenantId,
    kind: "SUBSCRIPTION_REMINDER",
    to: recipientOf(request.tenant.phone),
    dedupeKey: subscriptionDedupeKey(request.invoiceNumber, request.subscription),
    message: subscriptionReminderMessage(request.tenant, request.subscription),
  })
}
