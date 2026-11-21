"use client"

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { formatDateId, fromWib } from "@/lib/datetime"
import { formatRupiah } from "@/lib/format"

export type RevenuePoint = { day: string; amount: number }

type Row = { label: string; full: string; amount: number }

function rowsOf(points: RevenuePoint[]): Row[] {
  return points.map((point) => {
    const date = fromWib(point.day)
    return { label: formatDateId(date, "d MMM"), full: formatDateId(date, "EEEE, d MMMM yyyy"), amount: point.amount }
  })
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

/** Grafik pendapatan harian; sumbu dan tooltip memakai nominal rupiah sebenarnya. */
export function RevenueChart({ points }: { points: RevenuePoint[] }) {
  const rows = rowsOf(points)
  const hasData = rows.some((row) => row.amount > 0)

  if (!hasData) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-dashed px-6 text-center text-sm text-muted-foreground">
        Belum ada pembayaran yang tercatat dalam 30 hari terakhir. Grafik muncul begitu ada uang masuk.
      </div>
    )
  }

  return (
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
            interval={4}
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
  )
}
