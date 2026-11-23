import type { CSSProperties } from "react"
import { Quote } from "lucide-react"
import { RatingStars } from "@/components/testimonials/rating"
import { TestimonialSubmitDialog, HERO_CHIP } from "@/components/public/testimonial-submit-dialog"
import { formatDateId } from "@/lib/datetime"
import {
  getTestimonialSummary,
  listPublicVehicleOptions,
  listPublishedTestimonials,
} from "@/server/queries/public"

const PANEL = "rounded-2xl border border-white/10 bg-white/[0.05] backdrop-blur"

function order(index: number) {
  return { "--i": index } as CSSProperties
}

function Initials({ name }: { name: string }) {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-ink-foreground">
      {name.trim().slice(0, 1).toUpperCase()}
    </span>
  )
}

/**
 * Ban testimoni di halaman publik. Sengaja tidak dirender sama sekali bila belum
 * ada ulasan terbit: strip "0,0 dari 5" lebih merugikan daripada tidak ada.
 */
export async function TestimonialSection({
  tenantId,
  slug,
  tenantName,
}: {
  tenantId: string
  slug: string
  tenantName: string
}) {
  const [summary, items, vehicleRows] = await Promise.all([
    getTestimonialSummary(tenantId),
    listPublishedTestimonials(tenantId, 9),
    listPublicVehicleOptions(tenantId),
  ])

  if (summary.count === 0 || items.length === 0) return null

  const vehicles = vehicleRows.map((vehicle) => ({
    id: vehicle.id,
    label: `${vehicle.brand} ${vehicle.model}`,
  }))
  const averageLabel = summary.average.toFixed(1).replace(".", ",")

  return (
    <section
      id="testimoni"
      aria-labelledby="testimoni-judul"
      className="relative isolate overflow-hidden bg-ink text-ink-foreground"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="anim-drift absolute -top-40 left-[-10%] size-[34rem] rounded-full bg-[radial-gradient(circle,rgb(245_158_11/0.18),transparent_62%)] blur-[70px]" />
        <div className="anim-drift absolute bottom-[-35%] right-[-14%] size-[36rem] rounded-full bg-[radial-gradient(circle,rgb(37_99_235/0.2),transparent_62%)] blur-[80px] [--d:-11s]" />
        <div className="bg-ink-grid absolute inset-0 opacity-70 [mask-image:radial-gradient(70%_60%_at_50%_50%,black,transparent_80%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>

      <div className="page-container space-y-8 py-16 sm:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <p className="anim-rise text-xs font-semibold tracking-[0.16em] text-accent uppercase">
              Testimoni
            </p>
            <h2
              id="testimoni-judul"
              style={{ "--d": "120ms" } as CSSProperties}
              className="anim-rise font-display max-w-[22ch] text-2xl leading-tight font-semibold tracking-tight text-white sm:text-3xl"
            >
              Kata pelanggan {tenantName}
            </h2>
          </div>
          <TestimonialSubmitDialog slug={slug} vehicles={vehicles} triggerClassName={HERO_CHIP} />
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)] lg:gap-6">
          <div className={`${PANEL} space-y-4 p-5`}>
            <div className="flex items-end gap-3">
              <p className="font-display text-5xl leading-none font-bold text-white tabular-nums">
                {averageLabel}
              </p>
              <div className="pb-1">
                <RatingStars value={summary.average} size="size-4" />
                <p className="mt-1 text-xs text-ink-muted">
                  {summary.count} ulasan · rata-rata {averageLabel}/5
                </p>
              </div>
            </div>

            <ul className="space-y-1.5">
              {[5, 4, 3, 2, 1].map((star, index) => {
                const hits = summary.breakdown[index] ?? 0
                const percent = Math.round((hits / summary.count) * 100)
                return (
                  <li
                    key={star}
                    className="flex items-center gap-2 text-xs text-ink-muted tabular-nums"
                  >
                    <span className="w-2 text-right">{star}</span>
                    <span aria-hidden className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                      <span
                        className="block h-full rounded-full bg-accent transition-[width] duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </span>
                    <span className="w-6 text-right">{hits}</span>
                  </li>
                )
              })}
            </ul>

            <p className="border-t border-white/10 pt-3 text-xs leading-relaxed text-ink-muted">
              Ulasan ditulis penyewa setelah mobilnya kembali. Kirim punyamu lewat tombol di atas —
              tampil di sini setelah ditinjau.
            </p>
          </div>

          <div className="@container">
            <ul className="grid grid-cols-1 gap-4 @[34rem]:grid-cols-2 @[52rem]:grid-cols-3">
              {items.map((item, index) => (
                <li
                  key={item.id}
                  style={order(index % 3)}
                  className={`reveal flex h-full flex-col gap-3 ${PANEL} p-4 sm:p-5`}
                >
                  <Quote aria-hidden className="size-5 text-accent/70" />
                  <p className="line-clamp-6 text-sm leading-relaxed text-ink-foreground/90">
                    “{item.message}”
                  </p>
                  <div className="mt-auto flex items-center gap-2.5 border-t border-white/10 pt-3">
                    {item.photoUrl ? (
                      <img
                        src={item.photoUrl}
                        alt=""
                        loading="lazy"
                        className="size-9 shrink-0 rounded-full border border-white/15 object-cover"
                      />
                    ) : (
                      <Initials name={item.author} />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{item.author}</p>
                      <p className="truncate text-xs text-ink-muted">
                        {item.vehicle
                          ? `${item.vehicle.brand} ${item.vehicle.model} · `
                          : ""}
                        {formatDateId(item.occurredAt, "d MMM yyyy")}
                      </p>
                    </div>
                    <RatingStars value={item.rating} className="ml-auto shrink-0" />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
