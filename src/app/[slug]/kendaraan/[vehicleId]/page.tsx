import type { Metadata } from "next"
import { Suspense } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
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
import { PriceCalculator } from "@/components/public/price-calculator"
import { VehicleStatusBadge, VehicleTypeBadge } from "@/components/shared/status-badge"
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
  const terms = termsList(tenant.terms)

  return (
    <div className="page-container space-y-6 py-6 sm:space-y-8 sm:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href={`/${tenant.slug}${query.ambil && query.kembali ? `?ambil=${query.ambil}&kembali=${query.kembali}` : ""}`}>
            <ArrowLeft aria-hidden />
            Kembali ke katalog
          </Link>
        </Button>
        <VehicleStatusBadge status={vehicle.status} />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <VehicleGallery
            name={name}
            shots={vehicle.photos.map((photo) => ({ id: photo.id, url: photo.url, caption: photo.alt }))}
          />

          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <VehicleTypeBadge type={vehicle.type} />
              <span className="text-sm text-muted-foreground tabular-nums">{vehicle.plate}</span>
            </div>
            <h1 className="text-[1.75rem] leading-9 font-semibold tracking-tight">
              {name} <span className="text-muted-foreground font-normal">{vehicle.year}</span>
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {vehicle.description ?? `Siap disewa di ${tenant.city}. Harga sudah termasuk servis rutin dan bantuan darurat.`}
            </p>
          </section>

          <section className="rounded-2xl border bg-card p-4 sm:p-5">
            <h2 className="mb-3 text-base font-semibold">Spesifikasi</h2>
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {specs.map((spec) => (
                <div key={spec.label} className="flex items-start justify-between gap-3 text-sm">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    {spec.icon}
                    {spec.label}
                  </dt>
                  <dd className="text-right font-medium">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <Suspense fallback={<VehicleAvailabilitySkeleton />}>
            <VehicleAvailabilitySection tenantId={tenant.id} vehicleId={vehicle.id} />
          </Suspense>

          <section className="rounded-2xl border bg-card p-4 sm:p-5">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
              <ShieldCheck aria-hidden className="size-4 text-primary" />
              Syarat sewa
            </h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {terms.map((term) => (
                <li key={term} className="flex gap-2">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground" />
                  <span>{term}</span>
                </li>
              ))}
            </ul>
            {tenant.address ? (
              <p className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin aria-hidden className="mt-0.5 size-4 shrink-0" />
                Ambil kendaraan di {tenant.address}
              </p>
            ) : null}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20">
          <div className="rounded-2xl border bg-card p-4 shadow-card sm:p-5">
            <div className="mb-4 space-y-1">
              <p className="text-2xl leading-8 font-semibold tabular-nums">
                {formatRupiah(vehicle.priceDaily)}
                <span className="text-sm font-normal text-muted-foreground"> /hari</span>
              </p>
              <ul className="space-y-0.5 text-sm text-muted-foreground tabular-nums">
                {vehicle.priceWeekly ? <li>{formatRupiah(vehicle.priceWeekly)} per minggu</li> : null}
                {vehicle.priceMonthly ? <li>{formatRupiah(vehicle.priceMonthly)} per bulan</li> : null}
                {vehicle.deposit ? <li>Deposit {formatRupiah(vehicle.deposit)}</li> : null}
              </ul>
            </div>

            {tenant.acceptingBookings ? (
              <PriceCalculator
                slug={tenant.slug}
                vehicleId={vehicle.id}
                hasDriver={vehicle.hasDriver}
                initial={{ ambil: query.ambil, kembali: query.kembali }}
              />
            ) : (
              <div className="space-y-3">
                <p className="rounded-xl bg-warning/10 p-3 text-sm">
                  {tenant.closedMessage ?? "Rental sedang tidak menerima pesanan baru."}
                </p>
                <Button asChild variant="outline" className="w-full">
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

          <p className="text-xs text-muted-foreground">
            Durasi sewa maksimal 180 hari. Dokumen KTP/SIM disimpan privat dan hanya bisa dibuka staf{" "}
            {tenant.name}.
          </p>
        </aside>
      </div>
    </div>
  )
}
