import type { Metadata } from "next"
import type { CSSProperties } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ClipboardCheck, Clock, Info, Loader2, Receipt, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BookingLookupForm } from "@/components/public/booking-lookup-form"
import { BookingPayButton } from "@/components/public/booking-pay-button"
import { Stepper } from "@/components/shared/stepper"
import { Notice, PublicPanel, SectionHeading } from "@/components/shared/layout-parts"
import { BookingPaymentBadge, BookingStatusBadge } from "@/components/shared/status-badge"
import { formatDateId } from "@/lib/datetime"
import { formatRupiah } from "@/lib/format"
import { getPaymentProvider } from "@/lib/payments/midtrans"
import { rentDueOf } from "@/lib/payments/reconcile"
import { getPublicTenant, whatsappLink } from "@/lib/tenant-public"
import { normalizePhone } from "@/lib/format"
import { bookingLookupInput } from "@/lib/validators/booking"
import { findPublicBooking, isDepositPaid } from "@/server/queries/public"
import { WhatsAppIcon } from "@/components/public/whatsapp-icon"

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

function order(index: number): CSSProperties {
  return { "--i": index } as CSSProperties
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; code: string }>
}): Promise<Metadata> {
  const { code } = await params
  // Status pesanan memuat kode + nomor WhatsApp di URL — jangan sampai terindeks.
  return { title: `Status pesanan ${code}`, robots: { index: false, follow: false } }
}

function LookupHero({ title, description }: { title: string; description: string }) {
  return (
    <section className="relative isolate overflow-hidden border-b border-border/70 bg-background">
      <div
        aria-hidden
        className="anim-drift pointer-events-none absolute -top-32 -right-24 -z-10 size-[360px] rounded-full bg-accent/12 blur-3xl motion-reduce:animate-none"
      />
      <div
        aria-hidden
        className="bg-grid pointer-events-none absolute inset-0 -z-10 opacity-70 [mask-image:radial-gradient(120%_90%_at_50%_0%,black,transparent_75%)]"
      />
      <div className="page-container pb-14 pt-10 sm:pb-16 sm:pt-12">
        <h1 className="anim-rise text-[1.85rem] leading-tight font-extrabold tracking-tight sm:text-[2.2rem]">{title}</h1>
        <p className="anim-rise mt-2 max-w-xl text-sm leading-6 text-muted-foreground [--d:120ms]">{description}</p>
      </div>
    </section>
  )
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
      <div>
        <LookupHero
          title="Lacak pesanan"
          description={`Masukkan nomor WhatsApp yang dipakai saat memesan untuk membuka pesanan ${rawCode.toUpperCase()}.`}
        />
        <div className="page-container -mt-11 pb-6 sm:-mt-12">
          <BookingLookupForm slug={tenant.slug} initialCode={rawCode.toUpperCase()} />
        </div>
      </div>
    )
  }

  const booking = await findPublicBooking(tenant.id, parsed.data.code, parsed.data.phone)

  if (!booking) {
    return (
      <div>
        <LookupHero
          title="Pesanan tidak ditemukan"
          description={`Kode ${parsed.data.code} tidak cocok dengan nomor WhatsApp ini. Cek lagi kode di email/WhatsApp Anda, atau pesan ulang nomor yang benar.`}
        />
        <div className="page-container -mt-11 pb-6 sm:-mt-12">
          <BookingLookupForm slug={tenant.slug} initialCode={parsed.data.code} initialPhone={parsed.data.phone} />
        </div>
      </div>
    )
  }

  const rows = [
    {
      label: "Kendaraan",
      value: (
        <Link
          href={`/${tenant.slug}/kendaraan/${booking.vehicle.id}`}
          className="link-underline font-medium transition-colors hover:text-accent motion-reduce:transition-none"
        >
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
    <div>
      <section className="relative isolate overflow-hidden border-b border-border/70 bg-background">
        <div
          aria-hidden
          className="anim-drift pointer-events-none absolute -top-32 -right-24 -z-10 size-[420px] rounded-full bg-accent/12 blur-3xl motion-reduce:animate-none"
        />
        <div
          aria-hidden
          className="anim-drift pointer-events-none absolute -bottom-36 -left-28 -z-10 size-[380px] rounded-full bg-primary/10 blur-3xl motion-reduce:animate-none [--d:-9s]"
        />
        <div
          aria-hidden
          className="bg-grid pointer-events-none absolute inset-0 -z-10 opacity-70 [mask-image:radial-gradient(120%_90%_at_50%_0%,black,transparent_75%)]"
        />
        <div className="page-container pt-6 pb-14 sm:pb-16">
          <div className="anim-fade flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">Kode booking</p>
              <h1 className="anim-rise text-[2rem] leading-tight font-extrabold tracking-tight tabular-nums sm:text-[2.4rem]">
                {booking.code}
              </h1>
            </div>
            <div className="anim-rise flex flex-wrap items-center gap-2 [--d:120ms]">
              <BookingStatusBadge status={booking.status} />
              <BookingPaymentBadge status={booking.paymentStatus} />
            </div>
          </div>
        </div>
      </section>

      <div className="page-container -mt-11 space-y-4 pb-6 sm:-mt-12 sm:space-y-5">
        <div className="reveal rounded-2xl border border-border/70 bg-card p-4 shadow-pop sm:p-5">
          <Stepper
            steps={TIMELINE}
            current={TIMELINE_STEP[booking.status] ?? 1}
            tone={closed ? "neutral" : booking.status === "COMPLETED" ? "success" : "accent"}
          />
        </div>

        {closed ? (
          <div className="reveal" style={order(1)}>
            <Notice tone="muted" icon={<Info aria-hidden />}>
              <p>
                {booking.status === "CANCELLED"
                  ? `Pesanan dibatalkan ${booking.cancelledAt ? formatDateId(booking.cancelledAt, "d MMMM yyyy · HH:mm") : ""}. ${booking.cancelReason ?? ""}`.trim()
                  : "Pesanan kedaluwarsa karena belum dibayar tepat waktu. Silakan pesan lagi bila kendaraannya masih tersedia."}
              </p>
            </Notice>
          </div>
        ) : null}

        {booking.status === "PENDING" ? (
          <div className="reveal" style={order(1)}>
            <Notice tone="warning" icon={<Clock aria-hidden />}>
              <p>
                Pesanan menunggu konfirmasi staf
                {booking.expiresAt ? ` sampai ${formatDateId(booking.expiresAt, "d MMMM yyyy · HH:mm")}` : ""}. Hubungi
                WhatsApp di bawah supaya kami segera memeriksa stok kendaraannya.
              </p>
            </Notice>
          </div>
        ) : null}

        {awaitingVerification ? (
          <div className="reveal" style={order(1)}>
            <Notice tone="info" icon={<Loader2 aria-hidden className="animate-spin" />}>
              <p>
                Pembayaran Anda sudah diterima dan sedang diverifikasi. Status berubah otomatis dalam beberapa menit —
                tidak perlu membayar dua kali.
              </p>
            </Notice>
          </div>
        ) : null}

        <div className="grid items-start gap-4 pt-1 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6">
          <div className="space-y-4 sm:space-y-5">
            <PublicPanel className="reveal">
              <SectionHeading icon={<ClipboardCheck aria-hidden />}>Detail pesanan</SectionHeading>
              <dl className="divide-y divide-border/50">
                {rows.map((row) => (
                  <div key={row.label} className="flex items-start justify-between gap-4 py-2 text-sm">
                    <dt className="text-muted-foreground">{row.label}</dt>
                    <dd className="max-w-[60%] text-right font-medium">{row.value}</dd>
                  </div>
                ))}
              </dl>
              {booking.notes ? (
                <p className="mt-3 border-t border-border/50 pt-3 text-sm text-muted-foreground">
                  Catatan: {booking.notes}
                </p>
              ) : null}
            </PublicPanel>

            <PublicPanel className="reveal">
              <SectionHeading icon={<Receipt aria-hidden />}>Biaya</SectionHeading>
              <ul className="space-y-1.5 text-sm">
                {amounts.map((item) => (
                  <li key={item.label} className="flex justify-between gap-3">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="tabular-nums">{formatRupiah(item.value)}</span>
                  </li>
                ))}
                <li className="mt-1.5 flex items-baseline justify-between gap-3 border-t border-border/50 pt-2.5 font-semibold">
                  <span>Total</span>
                  <span className="text-[1.15rem] leading-6 tabular-nums">{formatRupiah(booking.totalAmount)}</span>
                </li>
                {booking.paidAmount ? (
                  <li className="flex justify-between gap-3 text-muted-foreground">
                    <span>Sudah dibayar</span>
                    <span className="tabular-nums">{formatRupiah(booking.paidAmount)}</span>
                  </li>
                ) : null}
                {outstanding > 0 && !closed ? (
                  <li className="flex justify-between gap-3 font-semibold">
                    <span>Sisa bayar</span>
                    <span className="tabular-nums">{formatRupiah(outstanding)}</span>
                  </li>
                ) : null}
              </ul>
              <p className="mt-3 flex items-start gap-2 border-t border-border/50 pt-3 text-xs leading-5 text-muted-foreground">
                <ShieldCheck aria-hidden className="mt-0.5 size-3.5 shrink-0 text-primary" />
                {canPay
                  ? "Bayar lewat tautan aman Midtrans di panel samping, atau tunai/transfer ke rental. Deposit dihitung terpisah dan dikembalikan saat kendaraan kembali."
                  : "Pembayaran tunai atau transfer ke rental. Nomor WhatsApp Anda akan dihubungi untuk konfirmasi tagihan."}
              </p>
            </PublicPanel>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-20">
            {canPay ? (
              <div className="reveal rounded-2xl border border-border/70 bg-card bg-[radial-gradient(120%_75%_at_50%_0%,rgb(245_158_11/0.10),transparent_62%)] p-4 shadow-pop sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">Sisa bayar</p>
                <p className="mt-0.5 mb-3 text-[1.6rem] leading-8 font-extrabold tracking-tight tabular-nums">
                  {formatRupiah(outstanding)}
                </p>
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

            <div className="reveal rounded-2xl border border-border/70 bg-card p-4 shadow-pop sm:p-5">
              <p className="mb-3 text-sm leading-5 text-muted-foreground">Perlu bantuan atau ada perubahan jadwal?</p>
              <Button
                asChild
                className="h-10 w-full rounded-full bg-accent px-5 text-[0.9rem] font-semibold text-accent-foreground shadow-[0_16px_34px_-16px_var(--accent)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent-hover motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <a
                  href={whatsappLink(tenant.phone, `Halo ${tenant.name}, saya ingin konfirmasi pesanan ${booking.code}.`)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <WhatsAppIcon className="size-4" />
                  Hubungi WhatsApp
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                className="mt-2 h-10 w-full rounded-full transition-transform duration-300 hover:-translate-y-0.5 motion-reduce:transition-none"
              >
                <Link href={`/${tenant.slug}`}>Pesan kendaraan lain</Link>
              </Button>
            </div>

            <p className="text-xs leading-5 text-muted-foreground">
              Simpan kode ini. Pesanan hanya bisa dibuka bersama nomor WhatsApp {normalizePhone(booking.customerPhone)}{" "}
              yang dipakai saat memesan.
            </p>
          </aside>
        </div>
      </div>
    </div>
  )
}
