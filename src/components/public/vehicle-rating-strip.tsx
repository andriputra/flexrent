import { Star } from "lucide-react"
import Link from "next/link"
import { PublicPanel, SectionHeading } from "@/components/shared/layout-parts"
import { RatingStars } from "@/components/testimonials/rating"
import { TestimonialSubmitDialog } from "@/components/public/testimonial-submit-dialog"
import { formatDateId } from "@/lib/datetime"
import {
  getTestimonialSummary,
  listTestimonialsForVehicle,
} from "@/server/queries/public"

/**
 * Strip rating kendaraan: rata-rata dari ulasan bertaut armada ini, dua kartu
 * teratas, dan tombol kirim ulasan. Hilang seluruhnya bila belum ada ulasan —
 * angka nol lebih merusak kepercayaan daripada ruang kosong.
 */
export async function VehicleRatingStrip({
  tenantId,
  slug,
  vehicleId,
  vehicleLabel,
}: {
  tenantId: string
  slug: string
  vehicleId: string
  vehicleLabel: string
}) {
  const [summary, items] = await Promise.all([
    getTestimonialSummary(tenantId, vehicleId),
    listTestimonialsForVehicle(tenantId, vehicleId, 2),
  ])

  if (summary.count === 0) return null

  return (
    <PublicPanel className="reveal">
      <SectionHeading
        icon={<Star aria-hidden />}
        description={
          summary.count > items.length
            ? `${summary.count} ulasan untuk kendaraan ini.`
            : undefined
        }
        action={
          <TestimonialSubmitDialog
            slug={slug}
            vehicles={[{ id: vehicleId, label: vehicleLabel }]}
            defaultVehicleId={vehicleId}
            triggerLabel="Tulis ulasan"
          />
        }
      >
        Ulasan pelanggan
      </SectionHeading>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-muted/30 px-3 py-2.5">
        <p className="font-display text-2xl leading-7 font-bold tabular-nums">
          {summary.average.toFixed(1).replace(".", ",")}
          <span className="text-sm font-medium text-muted-foreground">/5</span>
        </p>
        <RatingStars value={summary.average} size="size-4" />
        <p className="text-xs text-muted-foreground tabular-nums">
          {summary.count} ulasan · {summary.breakdown[0] ?? 0} di antaranya bintang 5
        </p>
        <Link
          href={`/${slug}#testimoni`}
          className="ml-auto text-xs font-medium text-accent hover:underline"
        >
          Lihat semua testimoni
        </Link>
      </div>

      {items.length ? (
        <ul className="@container mt-3 grid grid-cols-1 gap-3 @[36rem]:grid-cols-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-2 rounded-xl border border-border/60 bg-muted/20 p-3"
            >
              <div className="flex items-center gap-2">
                {item.photoUrl ? (
                  <img
                    src={item.photoUrl}
                    alt=""
                    loading="lazy"
                    className="size-7 shrink-0 rounded-full border object-cover"
                  />
                ) : (
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-background text-xs font-semibold">
                    {item.author.trim().slice(0, 1).toUpperCase()}
                  </span>
                )}
                <p className="min-w-0 truncate text-sm font-medium">{item.author}</p>
                <RatingStars value={item.rating} className="ml-auto shrink-0" />
              </div>
              <p className="line-clamp-4 text-sm leading-6 text-foreground/90">“{item.message}”</p>
              <p className="mt-auto text-xs text-muted-foreground tabular-nums">
                {formatDateId(item.occurredAt, "d MMM yyyy")}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </PublicPanel>
  )
}
