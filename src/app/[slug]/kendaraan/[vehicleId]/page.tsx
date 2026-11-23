import type { Metadata } from "next"
import type { ReactNode } from "react"
import { Suspense } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  Banknote,
  Car,
  CalendarDays,
  Fuel,
  Gauge,
  MapPin,
  MessageCircle,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { VehicleGallery } from "@/components/public/vehicle-gallery"
import { VehicleRatingStrip } from "@/components/public/vehicle-rating-strip"
import { PriceCalculator } from "@/components/public/price-calculator"
import { VehicleStatusBadge, VehicleTypeBadge } from "@/components/shared/status-badge"
import { PublicPanel, SectionHeading } from "@/components/shared/layout-parts"
import {
  VehicleAvailabilitySection,
  VehicleAvailabilitySkeleton,
} from "@/components/public/vehicle-availability-section"
import { formatRupiah } from "@/lib/format"
import { publicMeta } from "@/lib/seo"
import { termsList } from "@/lib/terms"
import { getPublicTenant, whatsappLink } from "@/lib/tenant-public"
import { parseCatalogQuery } from "@/lib/validators/public"
import { getCatalogVehicle } from "@/server/queries/public"

function fuelLabel(fuel: string): string {
  return fuel === "PETROL" ? "Bensin" : fuel === "DIESEL" ? "Solar" : fuel === "HYBRID" ? "Hybrid" : "Listrik"
}

function SpecTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="group/spec flex min-w-0 items-center gap-3 rounded-xl border border-border/60 bg-muted/25 px-3 py-2.5 transition-colors duration-300 hover:border-accent/40 hover:bg-muted/50 motion-reduce:transition-none">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-card text-muted-foreground shadow-card transition-colors duration-300 group-hover/spec:text-accent motion-reduce:transition-none">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-[0.7rem] leading-tight text-muted-foreground">{label}</dt>
        <dd className="text-sm leading-5 font-medium">{value}</dd>
      </div>
    </div>
  )
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; vehicleId: string }>
}): Promise<Metadata> {
  const { slug, vehicleId } = await params
  const tenant = await getPublicTenant(slug)
  if (!tenant) return { title: "Rental tidak ditemukan" }
  const vehicle = await getCatalogVehicle(tenant.id, vehicleId)
  if (!vehicle) return { title: "Kendaraan tidak ditemukan" }
  const photo = vehicle.photos.find((item) => item.isPrimary) ?? vehicle.photos[0]
  return publicMeta({
    title: `Sewa ${vehicle.brand} ${vehicle.model} ${vehicle.year} — ${tenant.name}`,
    description: `Tarif ${formatRupiah(vehicle.priceDaily)} per hari. Cek ketersediaan dan pesan online.`,
    path: `/${tenant.slug}/kendaraan/${vehicle.id}`,
    image: photo?.url ?? tenant.logoUrl,
  })
}

export default async function PublicVehicleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; vehicleId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { slug, vehicleId } = await params
  const tenant = await getPublicTenant(slug)
  if (!tenant) notFound()

  const vehicle = await getCatalogVehicle(tenant.id, vehicleId)
  if (!vehicle) notFound()

  const query = parseCatalogQuery(await searchParams)

  const name = `${vehicle.brand} ${vehicle.model}`
  const specs = [
    { icon: <Car aria-hidden className="size-4" />, label: "Transmisi", value: vehicle.transmission === "MATIC" ? "Matic" : "Manual" },
    vehicle.type === "MOTOR"
      ? { icon: <Gauge aria-hidden className="size-4" />, label: "Kapasitas mesin", value: vehicle.engineCc ? `${vehicle.engineCc} CC` : "—" }
      : { icon: <Users aria-hidden className="size-4" />, label: "Jumlah kursi", value: vehicle.seats ? `${vehicle.seats} kursi` : "—" },
    { icon: <Fuel aria-hidden className="size-4" />, label: "Bahan bakar", value: fuelLabel(vehicle.fuelType) },
    { icon: <CalendarDays aria-hidden className="size-4" />, label: "Tahun", value: String(vehicle.year) },
    ...(vehicle.color ? [{ icon: <Car aria-hidden className="size-4" />, label: "Warna", value: vehicle.color }] : []),
    ...(vehicle.hasDriver
      ? [
          {
            icon: <UserRound aria-hidden className="size-4" />,
            label: "Layanan sopir",
            value: vehicle.driverFee ? `Dengan sopir ${formatRupiah(vehicle.driverFee)}/hari` : "Dengan sopir",
          },
        ]
      : []),
  ]
  const tiers = [
    vehicle.priceWeekly ? `${formatRupiah(vehicle.priceWeekly)} per minggu` : null,
    vehicle.priceMonthly ? `${formatRupiah(vehicle.priceMonthly)} per bulan` : null,
    vehicle.deposit ? `Deposit ${formatRupiah(vehicle.deposit)}` : null,
  ].filter((value): value is string => Boolean(value))
  const terms = termsList(tenant.terms)

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

        <div className="page-container pt-5 pb-14 sm:pt-6 sm:pb-16">
          <div className="anim-fade flex flex-wrap items-center justify-between gap-3">
            <Button asChild variant="ghost" size="sm" className="-ml-2 transition-transform duration-300 hover:-translate-x-0.5 motion-reduce:transition-none">
              <Link href={`/${tenant.slug}${query.ambil && query.kembali ? `?ambil=${query.ambil}&kembali=${query.kembali}` : ""}`}>
                <ArrowLeft aria-hidden />
                Kembali ke katalog
              </Link>
            </Button>
            <VehicleStatusBadge status={vehicle.status} />
          </div>

          <div className="mt-4 space-y-2.5">
            <div className="anim-rise flex flex-wrap items-center gap-2">
              <VehicleTypeBadge type={vehicle.type} />
              <span className="rounded-full border border-border/70 bg-card/70 px-2.5 py-1 text-xs text-muted-foreground tabular-nums">
                {vehicle.plate}
              </span>
            </div>
            <h1 className="anim-rise font-display max-w-[22ch] text-[1.9rem] leading-tight font-bold tracking-tight sm:text-[2.35rem] [--d:80ms]">
              {name} <span className="font-normal text-muted-foreground">{vehicle.year}</span>
            </h1>
            <p className="anim-rise max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[0.9rem] [--d:160ms]">
              {vehicle.description ?? `Siap disewa di ${tenant.city}. Harga sudah termasuk servis rutin dan bantuan darurat.`}
            </p>
          </div>
        </div>
      </section>

      <div className="page-container -mt-11 pb-4 sm:-mt-12">
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6">
          <div className="space-y-5">
            <div className="reveal">
              <VehicleGallery
                name={name}
                type={vehicle.type}
                shots={vehicle.photos.map((photo) => ({ id: photo.id, url: photo.url, caption: photo.alt }))}
              />
            </div>

            <PublicPanel className="reveal">
              <SectionHeading icon={<Car aria-hidden />}>Spesifikasi</SectionHeading>
              <dl className="grid gap-2 sm:grid-cols-2">
                {specs.map((spec) => (
                  <SpecTile key={spec.label} icon={spec.icon} label={spec.label} value={spec.value} />
                ))}
              </dl>
            </PublicPanel>

            <VehicleRatingStrip
              tenantId={tenant.id}
              slug={tenant.slug}
              vehicleId={vehicle.id}
              vehicleLabel={`${vehicle.brand} ${vehicle.model}`}
            />

            <Suspense fallback={<VehicleAvailabilitySkeleton />}>
              <VehicleAvailabilitySection tenantId={tenant.id} vehicleId={vehicle.id} />
            </Suspense>

            <PublicPanel className="reveal">
              <SectionHeading icon={<ShieldCheck aria-hidden />}>Syarat sewa</SectionHeading>
              <ul className="grid gap-2 sm:grid-cols-2">
                {terms.map((term) => (
                  <li key={term} className="flex gap-2 rounded-xl bg-muted/25 px-3 py-2 text-sm text-muted-foreground">
                    <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                    <span>{term}</span>
                  </li>
                ))}
              </ul>
              {tenant.address ? (
                <p className="mt-3 flex items-start gap-2 border-t border-border/60 pt-3 text-sm text-muted-foreground">
                  <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
                  Ambil kendaraan di {tenant.address}
                </p>
              ) : null}
            </PublicPanel>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-20">
            <div className="reveal rounded-2xl border border-border/70 bg-card bg-[radial-gradient(120%_75%_at_50%_0%,rgb(245_158_11/0.10),transparent_62%)] p-4 shadow-pop sm:p-5">
              <div className="space-y-2">
                <p className="text-[0.7rem] font-semibold tracking-[0.14em] text-muted-foreground/70 uppercase">
                  Tarif
                </p>
                <p className="flex items-baseline gap-1">
                  <span className="text-[1.6rem] leading-8 font-extrabold tracking-tight tabular-nums">
                    {formatRupiah(vehicle.priceDaily)}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">/hari</span>
                </p>
                {tiers.length ? (
                  <ul className="flex flex-wrap gap-1.5">
                    {tiers.map((tier) => (
                      <li
                        key={tier}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground tabular-nums"
                      >
                        <Banknote aria-hidden className="size-3.5" />
                        {tier}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="mt-4 border-t border-border/60 pt-4">
                {tenant.acceptingBookings ? (
                  <PriceCalculator
                    slug={tenant.slug}
                    vehicleId={vehicle.id}
                    hasDriver={vehicle.hasDriver}
                    initial={{ ambil: query.ambil, kembali: query.kembali }}
                  />
                ) : (
                  <div className="space-y-3">
                    <p className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm">
                      {tenant.closedMessage ?? "Rental sedang tidak menerima pesanan baru."}
                    </p>
                    <Button
                      asChild
                      variant="outline"
                      className="h-10 w-full rounded-full transition-all duration-300 hover:-translate-y-0.5 motion-reduce:transition-none"
                    >
                      <a
                        href={whatsappLink(tenant.phone, `Halo ${tenant.name}, saya tanya ${name} ya.`)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <MessageCircle aria-hidden />
                        Tanya lewat WhatsApp
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
              <ShieldCheck aria-hidden className="mt-0.5 size-3.5 shrink-0 text-primary" />
              Durasi sewa maksimal 180 hari. Dokumen KTP/SIM disimpan privat dan hanya bisa dibuka staf {tenant.name}.
            </p>
          </aside>
        </div>
      </div>
    </div>
  )
}
