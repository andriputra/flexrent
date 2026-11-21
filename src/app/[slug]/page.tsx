import { Suspense } from "react"
import type { Metadata } from "next"
import type { Transmission, VehicleType } from "@prisma/client"
import { SearchX } from "lucide-react"
import { EmptyState } from "@/components/shared/layout-parts"
import { AvailabilitySearch } from "@/components/public/availability-search"
import { CatalogFilters } from "@/components/public/catalog-filters"
import { CatalogSkeleton } from "@/components/public/catalog-skeleton"
import { VehicleCard } from "@/components/public/vehicle-card"
import { fromWib, toDayKey } from "@/lib/datetime"
import { publicMeta } from "@/lib/seo"
import { getPublicTenant } from "@/lib/tenant-public"
import { parseCatalogQuery, type CatalogQuery } from "@/lib/validators/public"
import { listCatalogVehicles } from "@/server/queries/public"

const TYPE_VALUES = { motor: "MOTOR", mobil: "MOBIL" } as const
const TRANSMISI_VALUES = { matic: "MATIC", manual: "MANUAL" } as const

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const tenant = await getPublicTenant(slug)
  if (!tenant) return { title: "Rental tidak ditemukan" }
  return publicMeta({
    title: `Sewa motor & mobil di ${tenant.city} — ${tenant.name}`,
    description:
      tenant.tagline ??
      `Lihat ketersediaan armada ${tenant.name}, hitung tarif sewa, dan pesan langsung lewat WhatsApp.`,
    path: `/${tenant.slug}`,
    image: tenant.logoUrl,
  })
}

async function CatalogResults({ slug, query }: { slug: string; query: CatalogQuery }) {
  const tenant = await getPublicTenant(slug)
  if (!tenant) return null

  const startsAt = query.ambil ? fromWib(query.ambil) : null
  const endsAt = query.kembali ? fromWib(query.kembali) : null

  const { rows, hiddenByDates } = await listCatalogVehicles(tenant.id, {
    type: query.jenis ? (TYPE_VALUES[query.jenis as "motor" | "mobil"] as VehicleType) : undefined,
    transmission: query.transmisi
      ? (TRANSMISI_VALUES[query.transmisi as "matic" | "manual"] as Transmission)
      : undefined,
    minDailyPrice: query.min || undefined,
    maxDailyPrice: query.maks || undefined,
    startsAt,
    endsAt,
  })

  const rangeLabel =
    startsAt && endsAt
      ? `${toDayKey(startsAt)} sampai ${toDayKey(endsAt)}`
      : null

  return (
    <div className="page-container space-y-6 py-6 sm:space-y-8 sm:py-8">
      <section className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-[1.75rem] leading-9 font-semibold tracking-tight sm:text-[2rem] sm:leading-11">
            {tenant.tagline ?? `Sewa motor & mobil di ${tenant.city}`}
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
            Pilih tanggal, lihat kendaraan yang benar-benar bebas pada rentang itu, lalu pesan.
            {tenant.address ? ` Kantor kami di ${tenant.address}.` : ""}
          </p>
        </div>

        <AvailabilitySearch
          slug={tenant.slug}
          today={toDayKey(new Date())}
          initial={{ ambil: query.ambil, kembali: query.kembali, jenis: query.jenis }}
        />
      </section>

      <CatalogFilters slug={tenant.slug} current={query} />

      <section className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg leading-6 font-semibold">
            {rows.length} kendaraan {rangeLabel ? `tersedia ${rangeLabel}` : "di armada ini"}
          </h2>
          {hiddenByDates > 0 ? (
            <p className="text-sm text-muted-foreground">
              {hiddenByDates} kendaraan sudah terisi pada tanggal itu.
            </p>
          ) : null}
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={<SearchX aria-hidden />}
            title="Belum ada kendaraan yang cocok"
            description={
              rangeLabel
                ? "Coba ubah rentang tanggal atau atur ulang filter. Kendaraan yang sedang terisi otomatis disembunyikan."
                : "Armada sedang diperbarui. Hubungi kami lewat WhatsApp untuk alternatif."
            }
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((vehicle) => (
              <li key={vehicle.id}>
                <VehicleCard
                  vehicle={vehicle}
                  slug={tenant.slug}
                  range={{ ambil: query.ambil, kembali: query.kembali }}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default async function PublicCatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { slug } = await params
  const query = parseCatalogQuery(await searchParams)

  return (
    <Suspense fallback={<CatalogSkeleton />}>
      <CatalogResults slug={slug} query={query} />
    </Suspense>
  )
}
