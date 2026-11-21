import Link from "next/link"
import type { BookingStatus } from "@prisma/client"
import { Button } from "@/components/ui/button"
import type { FleetTimeline, TimelineSegment } from "@/server/queries/bookings"
import { cn } from "@/lib/utils"

/** Warna bilah timeline mengikuti badge status agar mudah dicocokkan. */
const SEGMENT_STYLE: Record<BookingStatus | "MAINTENANCE", string> = {
  PENDING: "border-warning/40 bg-warning/15 text-warning",
  CONFIRMED: "border-info/40 bg-info/15 text-info",
  ONGOING: "border-primary/40 bg-primary/15 text-primary",
  COMPLETED: "border-border bg-muted text-muted-foreground",
  CANCELLED: "border-border bg-muted text-muted-foreground",
  EXPIRED: "border-border bg-muted text-muted-foreground",
  MAINTENANCE: "border-danger/30 bg-danger/10 text-danger",
}

const COLUMN_WIDTH = "minmax(52px, 1fr)"

function gridTemplate(days: number): string {
  return `190px repeat(${days}, ${COLUMN_WIDTH})`
}

function SegmentBar({ segment }: { segment: TimelineSegment }) {
  const inner = (
    <>
      <span className="block truncate text-[0.7rem] leading-tight font-medium">{segment.title}</span>
      <span className="block truncate font-mono text-[0.65rem] leading-tight opacity-80">{segment.subtitle}</span>
    </>
  )
  const classes = cn(
    "relative flex h-9 flex-col justify-center gap-0 overflow-hidden rounded-md border px-1.5",
    SEGMENT_STYLE[segment.status]
  )

  const style = {
    gridColumnStart: segment.startIndex + 2,
    gridColumnEnd: `span ${segment.spanDays}`,
    gridRow: 1,
  }

  return segment.href ? (
    <Link href={segment.href} style={style} className={cn(classes, "hover:brightness-105")} title={segment.title}>
      {inner}
    </Link>
  ) : (
    <div style={style} className={classes} title={segment.title}>
      {inner}
    </div>
  )
}

export function BookingTimeline({
  timeline,
  rangeLabel,
  prevHref,
  todayHref,
  nextHref,
}: {
  timeline: FleetTimeline
  rangeLabel: string
  prevHref: string
  todayHref: string
  nextHref: string
}) {
  const template = gridTemplate(timeline.days)

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{rangeLabel}</p>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={prevHref}>2 minggu sebelumnya</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={todayHref}>Hari ini</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={nextHref}>2 minggu berikutnya</Link>
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
        <div className="min-w-max">
          <div className="grid border-b bg-muted/40" style={{ gridTemplateColumns: template }}>
            <div className="sticky left-0 z-20 flex items-center bg-muted/40 px-3 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Kendaraan
            </div>
            {timeline.columns.map((column, index) => (
              <div
                key={column.key}
                style={{ gridColumnStart: index + 2, gridRow: 1 }}
                className={cn(
                  "border-l px-1 py-1.5 text-center text-[0.7rem] leading-tight",
                  column.isWeekend ? "bg-muted/70" : null,
                  column.isToday ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground"
                )}
              >
                <span className="block">{column.dayLabel}</span>
              </div>
            ))}
          </div>

          {timeline.vehicles.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              Belum ada kendaraan aktif. Tambahkan armada lewat menu Kendaraan.
            </p>
          ) : (
            timeline.vehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                className="grid border-b last:border-b-0"
                style={{ gridTemplateColumns: template }}
              >
                <div className="sticky left-0 z-10 flex flex-col justify-center bg-card px-3 py-1.5">
                  <Link
                    href={`/dashboard/vehicles/${vehicle.id}`}
                    className="truncate text-sm font-medium hover:underline"
                  >
                    {vehicle.label}
                  </Link>
                  <span className="truncate font-mono text-[0.7rem] text-muted-foreground">
                    {vehicle.plate}
                    {vehicle.isRentedToday ? " · disewa hari ini" : ""}
                  </span>
                </div>

                {timeline.columns.map((column, index) => (
                  <div
                    key={column.key}
                    style={{ gridColumnStart: index + 2, gridRow: 1 }}
                    className={cn(
                      "h-9 border-l",
                      column.isWeekend ? "bg-muted/50" : null,
                      column.isToday ? "bg-primary/5" : null
                    )}
                  />
                ))}

                {vehicle.segments.map((segment, index) => (
                  <SegmentBar key={`${segment.code}-${index}`} segment={segment} />
                ))}
              </div>
            ))
          )}
        </div>
      </div>

      {timeline.unassigned.length > 0 ? (
        <div className="rounded-xl border border-dashed bg-card/60 px-4 py-3">
          <p className="text-sm font-medium">Pesanan pada kendaraan nonaktif</p>
          <p className="text-xs text-muted-foreground">
            Kendaraannya sudah tidak ditampilkan, tapi pesannya masih ada. Rapikan statusnya supaya kalender bersih.
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {timeline.unassigned.map((segment, index) => (
              <li key={`${segment.code}-${index}`}>
                {segment.href ? (
                  <Link
                    href={segment.href}
                    className={cn(
                      "inline-flex max-w-[260px] items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted",
                      SEGMENT_STYLE[segment.status]
                    )}
                  >
                    <span className="truncate">{segment.title}</span>
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {(
          [
            ["PENDING", "Menunggu konfirmasi"],
            ["CONFIRMED", "Dikonfirmasi"],
            ["ONGOING", "Sedang disewa"],
            ["COMPLETED", "Selesai"],
            ["MAINTENANCE", "Jadwal perawatan"],
          ] as const
        ).map(([status, label]) => (
          <span key={status} className="inline-flex items-center gap-1.5">
            <span className={cn("size-2.5 rounded-sm border", SEGMENT_STYLE[status])} aria-hidden />
            {label}
          </span>
        ))}
      </div>
    </section>
  )
}
