import { Suspense } from "react"
import type { CSSProperties } from "react"
import type { Metadata } from "next"
import type { Transmission, VehicleType } from "@prisma/client"
import { SearchX } from "lucide-react"
import { EmptyState } from "@/components/shared/layout-parts"
import { AvailabilitySearch } from "@/components/public/availability-search"
import { CatalogFilters } from "@/components/public/catalog-filters"
import { CatalogSkeleton } from "@/components/public/catalog-skeleton"
import { VehicleCard } from "@/components/public/vehicle-card"
import { formatDateId, fromWib, toDayKey } from "@/lib/datetime"
import { publicMeta } from "@/lib/seo"
import { getPublicTenant } from "@/lib/tenant-public"
import { parseCatalogQuery, type CatalogQuery } from "@/lib/validators/public"
import { listCatalogVehicles } from "@/server/queries/public"

const TYPE_VALUES = { motor: "MOTOR", mobil: "MOBIL" } as const
const TRANSMISI_VALUES = { matic: "MATIC", manual: "MANUAL" } as const

function order(index: number) {
  return { "--i": index } as CSSProperties
}

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
      ? `${formatDateId(startsAt, "EEE, d MMM")} sampai ${formatDateId(endsAt, "EEE, d MMM")}`
      : null

  return (
    <>
      <section className="relative isolate overflow-hidden bg-background">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="anim-drift absolute -top-56 right-[-14%] size-[32rem] rounded-full bg-[radial-gradient(circle,rgb(245_158_11/0.16),transparent_62%)] blur-[70px]" />
          <div className="anim-drift absolute -bottom-64 left-[-16%] size-[28rem] rounded-full bg-[radial-gradient(circle,rgb(37_99_235/0.12),transparent_62%)] blur-[70px] [--d:-8s]" />
          <div className="bg-grid absolute inset-0 opacity-80 [mask-image:radial-gradient(70%_70%_at_50%_0%,black,transparent_78%)]" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
        </div>

        <div className="page-container space-y-3 pt-20 pb-24 sm:pt-28 sm:pb-32">
          <h1 className="anim-rise font-display max-w-[20ch] text-[1.85rem] leading-[1.12] font-bold tracking-tight sm:text-[2.3rem]">
            {tenant.tagline ?? `Sewa motor & mobil di ${tenant.city}`}
          </h1>
          <p className="anim-rise max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base [--d:120ms]">
            Pilih tanggal, lihat kendaraan yang benar-benar bebas pada rentang itu, lalu pesan.
            {tenant.address ? ` Kantor kami di ${tenant.address}.` : ""}
          </p>
        </div>
      </section>

      <div className="page-container -mt-16 space-y-6 pb-16 sm:-mt-20 sm:space-y-8 sm:pb-20">
        <AvailabilitySearch
          slug={tenant.slug}
          today={toDayKey(new Date())}
          initial={{ ambil: query.ambil, kembali: query.kembali, jenis: query.jenis }}
        />

        <CatalogFilters slug={tenant.slug} current={query} />

        <section className="space-y-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display flex items-center gap-2.5 text-lg font-semibold tracking-tight">
              <span aria-hidden className="h-5 w-1 shrink-0 rounded-full bg-gradient-to-b from-accent to-accent/40" />
              <span>
                {rows.length} kendaraan{" "}
                <span className="text-muted-foreground font-normal">
                  {rangeLabel ? `tersedia ${rangeLabel}` : "di armada ini"}
                </span>
              </span>
            </h2>
            {hiddenByDates > 0 ? (
              <p className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
                <span aria-hidden className="size-1.5 rounded-full bg-muted-foreground/60" />
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
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map((vehicle, index) => (
                <li key={vehicle.id} className="reveal" style={order(index % 3)}>
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
    </>
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
