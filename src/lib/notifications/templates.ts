import type { BookingStatus, NotificationKind } from "@prisma/client"
import { diffInCalendarDays, formatDateId, toDayKey } from "@/lib/datetime"
import { formatRupiah, normalizePhone } from "@/lib/format"

export type NotifyTenant = {
  name: string
  slug: string
  phone: string
}

export type NotifyBooking = {
  code: string
  status: BookingStatus
  customerName: string
  customerPhone: string
  startsAt: Date
  endsAt: Date
  totalAmount: number
  paidAmount: number
  lateFee: number
  vehicle: { brand: string; model: string }
}

export type NotifyInput = { tenant: NotifyTenant; booking: NotifyBooking }

function appOrigin(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "")
}

export function statusUrl({ tenant, booking }: NotifyInput): string {
  return `${appOrigin()}/${tenant.slug}/booking/${booking.code}?phone=${normalizePhone(booking.customerPhone)}`
}

/** "hari ini" / "besok" / tanggal penuh, supaya pengingat tidak pernah salah menyebut besok. */
function whenInWords(from: Date, target: Date): string {
  const days = diffInCalendarDays(from, target)
  if (days <= 0) return "hari ini"
  if (days === 1) return "besok"
  return formatDateId(target, "EEEE, d MMMM yyyy")
}

function vehicleOf({ vehicle }: NotifyBooking): string {
  return `${vehicle.brand} ${vehicle.model}`.trim()
}

const greeting = (name: string) => `Halo ${name.split(" ")[0] || "Kak"},`

const BOOKING_CREATED = ({ tenant, booking }: NotifyInput) =>
  `${greeting(booking.customerName)} pesanan Anda di ${tenant.name} sudah kami terima.

Kode booking: ${booking.code}
Kendaraan: ${vehicleOf(booking)}
Ambil: ${formatDateId(booking.startsAt, "EEEE, d MMMM yyyy pukul HH:mm")}
Kembali: ${formatDateId(booking.endsAt, "EEEE, d MMMM yyyy pukul HH:mm")}
Total: ${formatRupiah(booking.totalAmount)}

Kami kabari lagi begitu staf mengonfirmasi ketersediaan kendaraannya. Cek status: ${statusUrl({ tenant, booking })}`

const PAYMENT_SETTLED = ({ tenant, booking }: NotifyInput) =>
  `${greeting(booking.customerName)} pembayaran ${formatRupiah(booking.paidAmount)} untuk booking ${booking.code} sudah kami terima. Terima kasih!

${vehicleOf(booking)} siap diambil ${whenInWords(new Date(), booking.startsAt)} (${formatDateId(booking.startsAt, "EEEE, d MMMM yyyy pukul HH:mm")}).
Simpan kode ${booking.code} dan tunjukkan saat serah terima di ${tenant.name}. Ada perubahan jadwal? Balas pesan ini.`

const PICKUP_REMINDER = ({ tenant, booking }: NotifyInput) =>
  `${greeting(booking.customerName)} pengingat pengambilan ${vehicleOf(booking)} ${whenInWords(new Date(), booking.startsAt)}.

Kode booking: ${booking.code}
Waktu ambil: ${formatDateId(booking.startsAt, "EEEE, d MMMM yyyy pukul HH:mm")}
Sisa bayar: ${formatRupiah(Math.max(0, booking.totalAmount - booking.paidAmount))}

Info rental: ${tenant.name}. Bantuannya bisa dilihat di ${statusUrl({ tenant, booking })}`

const RETURN_REMINDER = ({ tenant, booking }: NotifyInput) =>
  `${greeting(booking.customerName)} sewa ${vehicleOf(booking)} dengan kode ${booking.code} berakhir ${whenInWords(new Date(), booking.endsAt)} (${formatDateId(booking.endsAt, "HH:mm")}).

Mohon kembalikan ${vehicleOf(booking)} ke ${tenant.name} tepat waktu supaya terhindar dari denda keterlambatan. Perlu perpanjangan? Balas pesan ini sebelum jam kembali.`

const LATE_NOTICE = ({ tenant, booking }: NotifyInput) => {
  const days = Math.max(0, diffInCalendarDays(booking.endsAt, new Date()))
  const fine =
    booking.lateFee > 0
      ? `Denda keterlambatan tercatat ${formatRupiah(booking.lateFee)}.`
      : "Belum ada denda tercatat, tapi denda keterlambatan mulai berjalan."
  return `${greeting(booking.customerName)} sewa ${vehicleOf(booking)} (kode ${booking.code}) sudah lewat ${days} hari dari tanggal kembali ${formatDateId(booking.endsAt, "d MMMM yyyy pukul HH:mm")}.

${fine} Segera hubungi ${tenant.name} untuk pengembalian atau perpanjangan: ${statusUrl({ tenant, booking })}`
}

/** Template pesan Bahasa Indonesia, satu fungsi per jenis notifikasi. */
export const templates: Record<NotificationKind, (input: NotifyInput) => string> = {
  BOOKING_CREATED,
  PAYMENT_SETTLED,
  PICKUP_REMINDER,
  RETURN_REMINDER,
  LATE_NOTICE,
}

export function buildNotificationMessage(kind: NotificationKind, input: NotifyInput): string {
  return templates[kind](input)
}

/**
 * Kunci anti ulang. Pengingat harian menyertakan tanggal supaya tetap terkirim
 * sekali per hari, konfirmasi pesanan/pembayaran cukup sekali seumur booking.
 */
export function dedupeKeyFor(kind: NotificationKind, booking: NotifyBooking, today = new Date()): string {
  switch (kind) {
    case "BOOKING_CREATED":
      return `${booking.code}:created`
    case "PAYMENT_SETTLED":
      return `${booking.code}:paid`
    case "PICKUP_REMINDER":
      return `${booking.code}:pickup:${toDayKey(booking.startsAt)}`
    case "RETURN_REMINDER":
      return `${booking.code}:return:${toDayKey(booking.endsAt)}`
    case "LATE_NOTICE":
      return `${booking.code}:late:${toDayKey(today)}`
  }
}
