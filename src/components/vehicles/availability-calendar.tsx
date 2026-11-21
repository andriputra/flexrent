"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { addDays, formatDateId, fromWib, toDayKey } from "@/lib/datetime"
import { overlaps } from "@/lib/schedule"
import { cn } from "@/lib/utils"

export type CalendarInterval = {
  startsAt: Date
  endsAt: Date
  kind: "BOOKING" | "MAINTENANCE"
  /** dikosongkan di halaman publik supaya data pelanggan tidak bocor */
  label?: string
}

const WEEKDAY_HEADERS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"]

/** Tanggal 1 pada bulan berikutnya/sebelumnya, dihitung dalam kalender WIB. */
function shiftMonth(anchor: Date, delta: number): Date {
  const [year, month] = toDayKey(anchor).split("-").map(Number)
  const shifted = new Date(Date.UTC(year, month - 1 + delta, 1))
  return fromWib(
    `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-01`,
    "00:00"
  )
}

/** Kalender bulanan: tanggal yang terblokir booking/perawatan ditandai. */
export function VehicleAvailabilityCalendar({
  intervals,
  today = new Date(),
}: {
  intervals: CalendarInterval[]
  today?: Date
}) {
  const [monthAnchor, setMonthAnchor] = useState(() => shiftMonth(today, 0))

  const days = useMemo(() => {
    const key = toDayKey(monthAnchor)
    const [year, month] = key.split("-").map(Number)
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
    const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
    const lead = (firstWeekday + 6) % 7

    const cells: { key: string; label: number; inMonth: boolean; date: Date }[] = []
    for (let index = 0; index < lead; index += 1) {
      const date = addDays(fromWib(`${key.slice(0, 7)}-01`, "00:00"), index - lead)
      cells.push({ key: toDayKey(date), label: Number(toDayKey(date).slice(-2)), inMonth: false, date })
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = fromWib(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`, "00:00")
      cells.push({ key: toDayKey(date), label: day, inMonth: true, date })
    }
    while (cells.length % 7 !== 0) {
      const date = addDays(cells[cells.length - 1].date, 1)
      cells.push({ key: toDayKey(date), label: Number(toDayKey(date).slice(-2)), inMonth: false, date })
    }
    return cells
  }, [monthAnchor])

  const todayKey = toDayKey(today)

  function statusFor(cell: (typeof days)[number]) {
    const dayStart = cell.date
    const dayEnd = addDays(dayStart, 1)
    const hits = intervals.filter((interval) =>
      overlaps({ startsAt: dayStart, endsAt: dayEnd }, { startsAt: interval.startsAt, endsAt: interval.endsAt })
    )
    if (hits.some((hit) => hit.kind === "BOOKING")) {
      return { className: "bg-primary/12 text-primary line-through decoration-primary/40", title: `Sudah dipesan · ${hits.find((hit) => hit.kind === "BOOKING")?.label ?? ""}` }
    }
    if (hits.some((hit) => hit.kind === "MAINTENANCE")) {
      return { className: "bg-warning/20 text-warning", title: `Perawatan · ${hits.find((hit) => hit.kind === "MAINTENANCE")?.label ?? ""}` }
    }
    return { className: "hover:bg-muted", title: "Tanggal bebas" }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold capitalize">{formatDateId(monthAnchor, "MMMM yyyy")}</p>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Bulan sebelumnya"
            onClick={() => setMonthAnchor(shiftMonth(monthAnchor, -1))}
          >
            <ChevronLeft aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Bulan berikutnya"
            onClick={() => setMonthAnchor(shiftMonth(monthAnchor, 1))}
          >
            <ChevronRight aria-hidden />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[0.7rem] font-medium text-muted-foreground">
        {WEEKDAY_HEADERS.map((label) => (
          <div key={label} className="py-1">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((cell) => {
          const status = statusFor(cell)
          return (
            <div
              key={cell.key}
              title={status.title}
              aria-label={`${cell.label} · ${status.title}`}
              className={cn(
                "flex h-11 items-center justify-center rounded-lg text-sm tabular-nums transition-colors",
                !cell.inMonth && "opacity-40",
                cell.key === todayKey && "ring-2 ring-accent",
                status.className
              )}
            >
              {cell.label}
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded bg-primary/20" aria-hidden /> Terpesan
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded bg-warning/30" aria-hidden /> Perawatan
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded ring-2 ring-accent" aria-hidden /> Hari ini
        </span>
      </div>
    </div>
  )
}
