import { Fragment, Suspense } from "react"
import type { CSSProperties } from "react"
import type { Metadata } from "next"
import type { Transmission, VehicleType } from "@prisma/client"
import { SearchX } from "lucide-react"
import { cn } from "cn"
import { EmptyState } from "@/components/shared/layout-parts"
import { AvailabilitySearch } from "@/components/public/availability-search"
import { CatalogFilters } from "@/components/public/catalog-filters"
import { CatalogSkeleton } from "@/components/public/catalog-skeleton"
import { TestimonialSection } from "@/components/public/testimonial-section"
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

type TitleSegment = { text: string; accent?: boolean }

/** Judul hero dinaikkan per kata, persis pola halaman utama Flexrent. */
function HeroTitle({ segments }: { segments: TitleSegment[] }) {
  const words = segments.flatMap((segment) =>
    segment.text.split(" ").map((text) => ({ text, accent: segment.accent }))
  )
  return (
    <h1 className="mt-6 font-display max-w-[20ch] text-[2.1rem] leading-[1.08] font-bold tracking-tight sm:text-[2.5rem] lg:text-[2.8rem]">
      {words.map((word, index) => (
        <Fragment key={`${word.text}-${index}`}>
          {index === 0 ? null : " "}
          <span
            style={order(index)}
            className={cn("anim-rise inline-block", word.accent && "text-accent")}
          >
            {word.text}
          </span>
        </Fragment>
      ))}
    </h1>
  )
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

  // Judul dibatasi 20ch per baris; tagline boleh 120 karakter (lihat validators/tenant),
  // jadi yang panjang tidak dijadikan baris kedua — meta description masih memakainya.
  const taglineAsTitle = tenant.tagline && tenant.tagline.length <= 48 ? tenant.tagline : null
  const titleSegments: TitleSegment[] = taglineAsTitle
    ? [{ text: `Sewa motor & mobil di ${tenant.city}` }, { text: taglineAsTitle, accent: true }]
    : [{ text: "Sewa motor & mobil" }, { text: `di ${tenant.city}.`, accent: true }]

  return (
    <>
      <section className="relative isolate overflow-hidden bg-ink text-ink-foreground">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="anim-drift absolute -top-56 right-[-14%] size-[44rem] rounded-full bg-[radial-gradient(circle,rgb(245_158_11/0.24),transparent_62%)] blur-[70px]" />
          <div className="anim-drift absolute bottom-[-30%] left-[-18%] size-[38rem] rounded-full bg-[radial-gradient(circle,rgb(37_99_235/0.22),transparent_62%)] blur-[80px] [--d:-9s]" />
          <div className="bg-ink-grid absolute inset-0 opacity-80 [mask-image:radial-gradient(75%_65%_at_50%_0%,black,transparent_78%)]" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>

        <div className="page-container pt-20 pb-28 sm:pt-24 sm:pb-32">
          <span className="anim-rise inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.07] px-3.5 py-1.5 text-xs font-medium text-ink-foreground/90 backdrop-blur">
            <span aria-hidden className="relative flex size-2 items-center justify-center">
              <span className="anim-ping absolute inset-0 rounded-full bg-accent" />
              <span className="size-1.5 rounded-full bg-accent" />
            </span>
            {tenant.acceptingBookings ? "Menerima pesanan" : "Sedang tutup"} · {tenant.city}
          </span>

          <HeroTitle segments={titleSegments} />

          <p
            style={{ "--d": "480ms" } as CSSProperties}
            className="anim-rise mt-6 max-w-xl text-[0.98rem] leading-relaxed text-ink-muted sm:text-base"
          >
            Pilih tanggal, lihat kendaraan yang benar-benar bebas pada rentang itu, lalu pesan.
            {tenant.address ? ` Kantor kami di ${tenant.address}.` : ""}
          </p>
        </div>
      </section>

      <div className="page-container -mt-16 space-y-6 pb-16 sm:-mt-20 sm:space-y-8 sm:pb-20">
        <AvailabilitySearch slug={tenant.slug} today={toDayKey(new Date())} current={query} />

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
            <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
              {rows.map((vehicle, index) => (
                <li key={vehicle.id} className="reveal" style={order(index % 2)}>
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

      <TestimonialSection tenantId={tenant.id} slug={tenant.slug} tenantName={tenant.name} />
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
