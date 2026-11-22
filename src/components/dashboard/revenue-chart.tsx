"use client"

import { useState } from "react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { formatDateId, fromWib } from "@/lib/datetime"
import { formatPercent, formatRupiah } from "@/lib/format"
import { cn } from "@/lib/utils"

export type RevenuePoint = { day: string; amount: number }

type Row = { label: string; full: string; amount: number }

const RANGES = [
  { days: 7, label: "7 hari" },
  { days: 30, label: "30 hari" },
  { days: 90, label: "90 hari" },
] as const

function rowsOf(points: RevenuePoint[]): Row[] {
  return points.map((point) => {
    const date = fromWib(point.day)
    return { label: formatDateId(date, "d MMM"), full: formatDateId(date, "EEEE, d MMMM yyyy"), amount: point.amount }
  })
}

function sumOf(points: RevenuePoint[]): number {
  return points.reduce((sum, point) => sum + point.amount, 0)
}

function shortRupiah(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}jt`
  if (value >= 1_000) return `${Math.round(value / 1_000)}rb`
  return String(value)
}

type TooltipPayload = { payload?: Row }[]

function RevenueTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload }) {
  if (!active || !payload || payload.length === 0) return null
  const row = payload[0]?.payload
  if (!row) return null
  return (
    <div className="rounded-lg border bg-card px-3 py-2 shadow-pop">
      <p className="text-xs text-muted-foreground">{row.full}</p>
      <p className="text-sm font-semibold tabular-nums">{formatRupiah(row.amount)}</p>
    </div>
  )
}

/**
 * Grafik kas masuk harian dengan pemilih rentang. `points` harus deret terpanjang
 * yang tersedia (90 hari) — potongan dan pembandingnya dihitung di sini.
 */
export function RevenueChart({ points }: { points: RevenuePoint[] }) {
  const [days, setDays] = useState<number>(30)
  const current = points.slice(-days)
  const previous = points.slice(-days * 2, -days)
  const rows = rowsOf(current)
  const total = sumOf(current)
  const previousTotal = sumOf(previous)
  const hasData = current.some((point) => point.amount > 0)
  const comparable = previous.length === days && previousTotal > 0
  const delta = comparable ? ((total - previousTotal) / previousTotal) * 100 : null
  const dailyAverage = current.length > 0 ? total / current.length : 0

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <p className="font-display text-xl leading-7 font-semibold tracking-tight tabular-nums">
            {formatRupiah(total)}
          </p>
          <p className="text-xs text-muted-foreground">
            rata-rata {formatRupiah(Math.round(dailyAverage))}/hari
          </p>
          {delta !== null ? (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
                delta >= 0 ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
              )}
            >
              {delta >= 0 ? "+" : "−"}
              {formatPercent(Math.abs(delta), 1)} vs {days} hari sebelumnya
            </span>
          ) : null}
        </div>
        <div
          role="group"
          aria-label="Rentang waktu grafik"
          className="inline-flex shrink-0 rounded-lg border bg-muted/60 p-0.5"
        >
          {RANGES.map((range) => (
            <button
              key={range.days}
              type="button"
              onClick={() => setDays(range.days)}
              aria-pressed={days === range.days}
              className={cn(
                "rounded-[7px] px-2.5 py-1 text-xs font-medium transition-colors",
                days === range.days
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {hasData ? (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="label"
                interval={Math.max(0, Math.floor(days / 6) - 1)}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                width={52}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={shortRupiah}
              />
              <Tooltip content={<RevenueTooltip />} cursor={{ stroke: "var(--border)" }} />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="var(--chart-2)"
                strokeWidth={2}
                fill="url(#revenueFill)"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex h-56 items-center justify-center rounded-xl border border-dashed px-6 text-center text-sm text-muted-foreground">
          Belum ada pembayaran yang tercatat dalam {days} hari terakhir. Grafik muncul begitu ada uang masuk.
        </div>
      )}
    </div>
  )
}
