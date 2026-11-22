import Link from "next/link"
import { ChevronRight, ShieldCheck } from "lucide-react"
import { formatDateId, fromWib } from "@/lib/datetime"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"
import type { ReturnLoad } from "@/server/queries/dashboard"

const TONE_CHIP = {
  danger: "bg-danger/10 text-danger",
  warning: "bg-warning/15 text-warning",
  info: "bg-info/10 text-info",
  primary: "bg-primary/10 text-primary",
} as const

export type AttentionItem = {
  href: string
  label: string
  detail: string
  value: number
  tone: keyof typeof TONE_CHIP
  icon: ReactNode
}

/** Daftar pekerjaan yang menunggu tindakan; baris bernol tidak ditampilkan. */
export function AttentionPanel({ items }: { items: AttentionItem[] }) {
  const open = items.filter((item) => item.value > 0)

  if (open.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 py-10 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-success/10 text-success [&_svg]:size-5">
          <ShieldCheck aria-hidden />
        </span>
        <p className="text-sm font-medium">Semua beres</p>
        <p className="text-xs leading-5 text-muted-foreground">
          Tidak ada sewa yang tertunggak, konfirmasi menunggu, atau perawatan jatuh tempo.
        </p>
      </div>
    )
  }

  return (
    <ul className="divide-y">
      {open.map((item) => (
        <li key={item.href + item.label}>
          <Link
            href={item.href}
            className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60"
          >
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 [&_svg]:size-4",
                TONE_CHIP[item.tone]
              )}
            >
              {item.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium leading-5">{item.label}</span>
              <span className="block truncate text-xs leading-4 text-muted-foreground">{item.detail}</span>
            </span>
            <span className="shrink-0 font-display text-base font-semibold tabular-nums">{item.value}</span>
            <ChevronRight
              aria-hidden
              className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </li>
      ))}
    </ul>
  )
}

/** Beban pengembalian 7 hari: batang kecil per hari, hari ini ditandai. */
export function ReturnStrip({ load, todayKey }: { load: ReturnLoad[]; todayKey: string }) {
  const max = Math.max(...load.map((day) => day.count), 1)

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {load.map((day) => {
        const isToday = day.day === todayKey
        const date = fromWib(day.day)
        return (
          <div
            key={day.day}
            title={`${day.count} kendaraan kembali ${formatDateId(date, "d MMMM")}`}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-xl border px-1 py-2 transition-colors",
              isToday ? "border-accent/50 bg-accent/10" : "border-border/70 bg-muted/30"
            )}
          >
            <span
              className={cn(
                "text-[0.68rem] font-semibold uppercase tracking-wide",
                isToday ? "text-accent" : "text-muted-foreground"
              )}
            >
              {formatDateId(date, "EEE")}
            </span>
            <span className="text-xs leading-4 tabular-nums text-muted-foreground">
              {formatDateId(date, "d")}
            </span>
            <span className="flex h-8 w-full items-end justify-center">
              <span
                className={cn(
                  "w-4 rounded-t transition-[height] duration-500",
                  day.count > 0 ? (isToday ? "bg-accent" : "bg-primary/60") : "bg-border"
                )}
                style={{ height: `${day.count > 0 ? Math.max(18, (day.count / max) * 100) : 8}%` }}
              />
            </span>
            <span className="text-xs font-semibold tabular-nums">{day.count}</span>
          </div>
        )
      })}
    </div>
  )
}

export type FleetSegment = { label: string; value: number; bar: string; dot: string }

/** Komposisi armada + seberapa banyak kendaraan yang sedang bergerak. */
export function FleetStatus({
  segments,
  rentedPercent,
  hint,
}: {
  segments: FleetSegment[]
  rentedPercent: number
  hint: string
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0)

  return (
    <div className="space-y-4 px-5 py-4">
      <div className="space-y-2.5">
        <div className="flex h-2.5 w-full gap-1 overflow-hidden rounded-full">
          {segments.map((segment) =>
            segment.value > 0 ? (
              <span
                key={segment.label}
                className={cn("rounded-full transition-[flex-grow] duration-500", segment.bar)}
                style={{ flexGrow: segment.value, flexBasis: 0 }}
              />
            ) : null
          )}
        </div>
        <ul className="space-y-1.5">
          {segments.map((segment) => (
            <li key={segment.label} className="flex items-center gap-2 text-xs leading-4">
              <span className={cn("size-2 shrink-0 rounded-full", segment.dot)} aria-hidden />
              <span className="flex-1 truncate text-muted-foreground">{segment.label}</span>
              <span className="font-medium tabular-nums">{segment.value}</span>
              <span className="w-10 text-right tabular-nums text-muted-foreground">
                {total > 0 ? Math.round((segment.value / total) * 100) : 0}%
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-1.5 border-t pt-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-xs leading-4 text-muted-foreground">Sedang bergerak</p>
          <p className="font-display text-lg leading-6 font-semibold tabular-nums">{rentedPercent}%</p>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <span
            className="block h-full rounded-full bg-accent transition-[width] duration-700"
            style={{ width: `${Math.min(100, Math.max(rentedPercent, 2))}%` }}
          />
        </div>
        <p className="text-xs leading-4 text-muted-foreground">{hint}</p>
      </div>
    </div>
  )
}
