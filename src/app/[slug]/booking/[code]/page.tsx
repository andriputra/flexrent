import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { MessageCircle, SearchX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BookingLookupForm } from "@/components/public/booking-lookup-form"
import { BookingPayButton } from "@/components/public/booking-pay-button"
import { Stepper } from "@/components/shared/stepper"
import { BookingPaymentBadge, BookingStatusBadge } from "@/components/shared/status-badge"
import { formatDateId } from "@/lib/datetime"
import { formatRupiah } from "@/lib/format"
import { getPaymentProvider } from "@/lib/payments/midtrans"
import { rentDueOf } from "@/lib/payments/reconcile"
import { getPublicTenant, whatsappLink } from "@/lib/tenant-public"
import { normalizePhone } from "@/lib/format"
import { bookingLookupInput } from "@/lib/validators/booking"
import { findPublicBooking, isDepositPaid } from "@/server/queries/public"

const TIMELINE = [
  { title: "Pesanan dibuat", description: "Menunggu konfirmasi staf" },
  { title: "Dikonfirmasi", description: "Staf menyetujui tanggal" },
  { title: "Sewa berjalan", description: "Kendaraan ada di Anda" },
  { title: "Selesai", description: "Kendaraan kembali" },
]

const TIMELINE_STEP: Record<string, number> = {
  PENDING: 1,
  CONFIRMED: 2,
  ONGOING: 3,
  COMPLETED: 4,
  CANCELLED: 1,
  EXPIRED: 1,
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; code: string }>
}): Promise<Metadata> {
  const { code } = await params
  return { title: `Status pesanan ${code}` }
}

export default async function PublicBookingStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; code: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { slug, code: rawCode } = await params
  const tenant = await getPublicTenant(slug)
  if (!tenant) notFound()

  const raw = await searchParams
  const phone = typeof raw.phone === "string" ? raw.phone : ""
  const justPaid = raw.paid === "1"
  const parsed = bookingLookupInput.safeParse({ code: rawCode, phone })

  if (!parsed.success) {
    return (
      <div className="page-container max-w-xl space-y-5 py-10 sm:py-14">
        <div className="space-y-2">
          <h1 className="text-[1.75rem] leading-9 font-semibold tracking-tight">Lacak pesanan</h1>
          <p className="text-sm text-muted-foreground">
            Masukkan nomor WhatsApp yang dipakai saat memesan untuk membuka pesanan {rawCode.toUpperCase()}.
          </p>
        </div>
        <BookingLookupForm slug={tenant.slug} initialCode={rawCode.toUpperCase()} />
      </div>
    )
  }

  const booking = await findPublicBooking(tenant.id, parsed.data.code, parsed.data.phone)

  if (!booking) {
    return (
      <div className="page-container max-w-xl space-y-5 py-10 sm:py-14">
        <div className="flex items-start gap-3 rounded-2xl border bg-card p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <SearchX aria-hidden className="size-5" />
          </span>
          <div className="space-y-1">
            <h1 className="text-lg leading-6 font-semibold">Pesanan tidak ditemukan</h1>
            <p className="text-sm text-muted-foreground">
              Kode <span className="font-medium tabular-nums">{parsed.data.code}</span> tidak cocok dengan nomor
              WhatsApp ini. Cek lagi kode di email/WhatsApp Anda, atau pesan ulang nomor yang benar.
            </p>
          </div>
        </div>
        <BookingLookupForm slug={tenant.slug} initialCode={parsed.data.code} initialPhone={parsed.data.phone} />
      </div>
    )
  }

  const rows = [
    {
      label: "Kendaraan",
      value: (
        <Link href={`/${tenant.slug}/kendaraan/${booking.vehicle.id}`} className="font-medium hover:underline">
          {booking.vehicle.brand} {booking.vehicle.model} {booking.vehicle.year}
        </Link>
      ),
    },
    { label: "Plat nomor", value: booking.vehicle.plate },
    { label: "Ambil", value: formatDateId(booking.startsAt, "EEEE, d MMMM yyyy · HH:mm") },
    { label: "Kembali", value: formatDateId(booking.endsAt, "EEEE, d MMMM yyyy · HH:mm") },
    { label: "Durasi", value: `${booking.days} hari` },
    { label: "Pengambilan", value: booking.deliveryMode === "DELIVERY" ? "Antar-jemput" : "Ambil di kantor" },
    ...(booking.deliveryMode === "DELIVERY"
      ? [{ label: "Alamat antar", value: booking.deliveryAddress ?? booking.deliveryArea ?? "—" }]
      : []),
    { label: "Sopir", value: booking.withDriver ? "Dengan sopir" : "Tanpa sopir" },
    { label: "Dipesan pada", value: formatDateId(booking.createdAt, "d MMMM yyyy · HH:mm") },
  ]

  const amounts = [
    { label: "Sewa", value: booking.rentalAmount },
    ...(booking.driverFee ? [{ label: "Sopir", value: booking.driverFee }] : []),
    ...(booking.deliveryFee ? [{ label: "Antar-jemput", value: booking.deliveryFee }] : []),
    ...(booking.depositAmount ? [{ label: "Deposit", value: booking.depositAmount }] : []),
    ...(booking.lateFee ? [{ label: "Denda keterlambatan", value: booking.lateFee }] : []),
    ...(booking.damageFee ? [{ label: "Denda kerusakan", value: booking.damageFee }] : []),
  ]

  const closed = booking.status === "CANCELLED" || booking.status === "EXPIRED"
  const outstanding = Math.max(0, rentDueOf(booking) - booking.paidAmount)
  const canPay = Boolean(getPaymentProvider()) && !closed && outstanding > 0
  const depositUnpaid = booking.depositAmount > 0 && !(await isDepositPaid(tenant.id, booking.id))
  const awaitingVerification = justPaid && booking.paymentStatus !== "PAID"

  return (
    <div className="page-container space-y-6 py-6 sm:space-y-8 sm:py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Kode booking</p>
          <h1 className="text-[1.75rem] leading-9 font-semibold tracking-tight tabular-nums">{booking.code}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BookingStatusBadge status={booking.status} />
          <BookingPaymentBadge status={booking.paymentStatus} />
        </div>
      </div>

      <Stepper steps={TIMELINE} current={TIMELINE_STEP[booking.status] ?? 1} />

      {closed ? (
        <p className="rounded-xl bg-muted/60 p-3 text-sm">
          {booking.status === "CANCELLED"
            ? `Pesanan dibatalkan ${booking.cancelledAt ? formatDateId(booking.cancelledAt, "d MMMM yyyy · HH:mm") : ""}. ${booking.cancelReason ?? ""}`.trim()
            : "Pesanan kedaluwarsa karena belum dibayar tepat waktu. Silakan pesan lagi bila kendaraannya masih tersedia."}
        </p>
      ) : null}

      {booking.status === "PENDING" ? (
        <p className="rounded-xl bg-warning/10 p-3 text-sm">
          Pesanan menunggu konfirmasi staf
          {booking.expiresAt ? ` sampai ${formatDateId(booking.expiresAt, "d MMMM yyyy · HH:mm")}` : ""}. Hubungi
          WhatsApp di bawah supaya kami segera memeriksa stok kendaraannya.
        </p>
      ) : null}

      {awaitingVerification ? (
        <p className="rounded-xl bg-info/10 p-3 text-sm">
          Pembayaran Anda sudah diterima dan sedang diverifikasi. Status berubah otomatis dalam beberapa menit — tidak
          perlu membayar dua kali.
        </p>
      ) : null}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <section className="rounded-2xl border bg-card p-4 sm:p-5">
            <h2 className="mb-3 text-base font-semibold">Detail pesanan</h2>
            <dl className="divide-y">
              {rows.map((row) => (
                <div key={row.label} className="flex items-start justify-between gap-4 py-2 text-sm">
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <dd className="max-w-[60%] text-right">{row.value}</dd>
                </div>
              ))}
            </dl>
            {booking.notes ? (
              <p className="mt-3 border-t pt-3 text-sm text-muted-foreground">Catatan: {booking.notes}</p>
            ) : null}
          </section>

          <section className="rounded-2xl border bg-card p-4 sm:p-5">
            <h2 className="mb-3 text-base font-semibold">Biaya</h2>
            <ul className="space-y-1.5 text-sm">
              {amounts.map((item) => (
                <li key={item.label} className="flex justify-between gap-3">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="tabular-nums">{formatRupiah(item.value)}</span>
                </li>
              ))}
              <li className="flex items-baseline justify-between gap-3 border-t pt-2 font-semibold">
                <span>Total</span>
                <span className="text-lg tabular-nums">{formatRupiah(booking.totalAmount)}</span>
              </li>
              {booking.paidAmount ? (
                <li className="flex justify-between gap-3 text-muted-foreground">
                  <span>Sudah dibayar</span>
                  <span className="tabular-nums">{formatRupiah(booking.paidAmount)}</span>
                </li>
              ) : null}
              {outstanding > 0 && !closed ? (
                <li className="flex justify-between gap-3 font-medium">
                  <span>Sisa bayar</span>
                  <span className="tabular-nums">{formatRupiah(outstanding)}</span>
                </li>
              ) : null}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              {canPay
                ? "Bayar lewat tautan aman Midtrans di panel samping, atau tunai/transfer ke rental. Deposit dihitung terpisah dan dikembalikan saat kendaraan kembali."
                : "Pembayaran tunai atau transfer ke rental. Nomor WhatsApp Anda akan dihubungi untuk konfirmasi tagihan."}
            </p>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20">
          {canPay ? (
            <div className="rounded-2xl border bg-card p-4 shadow-card sm:p-5">
              <p className="text-sm text-muted-foreground">Sisa bayar</p>
              <p className="mb-3 text-2xl font-semibold tabular-nums">{formatRupiah(outstanding)}</p>
              <BookingPayButton
                slug={tenant.slug}
                code={booking.code}
                phone={booking.customerPhone}
                kind="RENTAL"
                label={`Bayar ${formatRupiah(outstanding)}`}
                hint="Anda diarahkan ke halaman pembayaran Midtrans yang aman."
              />
              {depositUnpaid ? (
                <div className="mt-2">
                  <BookingPayButton
                    slug={tenant.slug}
                    code={booking.code}
                    phone={booking.customerPhone}
                    kind="DEPOSIT"
                    variant="outline"
                    label={`Bayar deposit ${formatRupiah(booking.depositAmount)}`}
                    hint="Deposit dikembalikan saat kendaraan kembali dalam kondisi baik."
                  />
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="rounded-2xl border bg-card p-4 shadow-card sm:p-5">
            <p className="mb-3 text-sm text-muted-foreground">Perlu bantuan atau ada perubahan jadwal?</p>
            <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent-hover">
              <a
                href={whatsappLink(tenant.phone, `Halo ${tenant.name}, saya ingin konfirmasi pesanan ${booking.code}.`)}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle aria-hidden />
                Hubungi WhatsApp
              </a>
            </Button>
            <Button asChild variant="outline" className="mt-2 w-full">
              <Link href={`/${tenant.slug}`}>Pesan kendaraan lain</Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Simpan kode ini. Pesanan hanya bisa dibuka bersama nomor WhatsApp {normalizePhone(booking.customerPhone)}{" "}
            yang dipakai saat memesan.
          </p>
        </aside>
      </div>
    </div>
  )
}
