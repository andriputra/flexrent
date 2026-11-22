import Link from "next/link"
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CSSProperties, ReactNode } from "react"

const TONES = {
  accent: "bg-accent/12 text-accent",
  info: "bg-info/12 text-info",
  success: "bg-success/12 text-success",
  primary: "bg-primary/10 text-primary",
} as const

export type MetricTone = keyof typeof TONES

function TrendPill({ direction, children }: { direction: "up" | "down" | "flat"; children: ReactNode }) {
  const Icon = direction === "down" ? ArrowDownRight : direction === "up" ? ArrowUpRight : Minus
  const color =
    direction === "up" ? "text-success" : direction === "down" ? "text-danger" : "text-muted-foreground"
  return (
    <span className={cn("inline-flex items-center gap-0.5 font-medium [&_svg]:size-3.5", color)}>
      <Icon aria-hidden />
      {children}
    </span>
  )
}

/** Garis tren kecil; sumbu Y dinormalkan ke nilai terbesar deret. */
export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const max = Math.max(...values, 1)
  const step = values.length > 1 ? 100 / (values.length - 1) : 100
  const line = values
    .map((value, index) => `${(index * step).toFixed(2)},${(28 - (value / max) * 24).toFixed(2)}`)
    .join(" ")

  return (
    <svg
      viewBox="0 0 100 30"
      preserveAspectRatio="none"
      aria-hidden
      className={cn("h-8 w-full", className)}
    >
      <polygon points={`0,30 ${line} 100,30`} className="fill-accent/15" />
      <polyline
        points={line}
        fill="none"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        className="stroke-accent"
      />
    </svg>
  )
}

export type Segment = { value: number; className: string; label: string }

/** Bar bertumpuk untuk komposisi sederhana (status armada, okupansi). */
export function SegmentBar({ segments, className }: { segments: Segment[]; className?: string }) {
  return (
    <div className={cn("flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full bg-muted", className)}>
      {segments.map((segment) =>
        segment.value > 0 ? (
          <span
            key={segment.label}
            title={`${segment.label}: ${segment.value}`}
            className={cn("rounded-full transition-[flex-grow] duration-500", segment.className)}
            style={{ flexGrow: segment.value, flexBasis: 0 }}
          />
        ) : null
      )}
    </div>
  )
}

/**
 * Kartu metrik dashboard: angka besar + satu visual (tren, komposisi, atau capaian)
 * dan bisa diklik ke halaman rinciannya.
 */
export function MetricCard({
  label,
  value,
  hint,
  icon,
  href,
  tone = "primary",
  trend,
  visual,
  index = 0,
}: {
  label: string
  value: string
  hint?: ReactNode
  icon: ReactNode
  href?: string
  tone?: MetricTone
  trend?: { direction: "up" | "down" | "flat"; label: string }
  visual?: ReactNode
  index?: number
}) {
  const shellClass = cn(
    "group relative flex flex-col gap-3 overflow-hidden rounded-xl bg-card p-5 ring-1 ring-foreground/10 shadow-card transition-all duration-300",
    "hover:-translate-y-0.5 hover:shadow-pop",
    "anim-rise"
  )

  const inner = (
    <>
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-[3px] origin-left scale-x-0 bg-accent transition-transform duration-300 group-hover:scale-x-100"
      />
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm leading-5 text-muted-foreground">{label}</p>
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110 [&_svg]:size-4",
            TONES[tone]
          )}
        >
          {icon}
        </span>
      </div>
      <p className="font-display text-[1.7rem] leading-8 font-semibold tracking-tight tabular-nums">{value}</p>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-4">
        {trend ? <TrendPill direction={trend.direction}>{trend.label}</TrendPill> : null}
        {hint ? <span className="text-muted-foreground">{hint}</span> : null}
      </div>
      {visual ? <div className="pt-1">{visual}</div> : null}
    </>
  )

  if (!href) {
    return (
      <div className={shellClass} style={{ "--i": index } as CSSProperties}>
        {inner}
      </div>
    )
  }

  return (
    <Link
      href={href}
      className={cn(shellClass, "focus-visible:outline-2 focus-visible:outline-offset-2")}
      style={{ "--i": index } as CSSProperties}
    >
      {inner}
    </Link>
  )
}
