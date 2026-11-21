import { addDays, fromWib, monthRangeWib, toDayKey } from "@/lib/datetime"
import { prisma } from "@/lib/db"
import type { VehicleRevenueReport } from "@/lib/reports"

const DAY_MS = 86_400_000

/**
 * Pendapatan dibaca dari baris Payment yang SETTLED, bukan dari nilai booking:
 * yang masuk ke rekening hanya pembayaran yang benar-benar tercatat. Deposit
 * sengaja tidak dihitung karena masih bisa dikembalikan ke pelanggan.
 */
async function settledRevenue(tenantId: string, start: Date, end: Date) {
  return prisma.payment.findMany({
    where: { tenantId, kind: "RENTAL", status: "SETTLED", paidAt: { gte: start, lt: end } },
    select: { amount: true, paidAt: true, booking: { select: { vehicleId: true } } },
  })
}

export type RevenuePoint = { day: string; amount: number }

/** Deret pendapatan harian (WIB) selama `days` hari terakhir, termasuk hari kosong. */
export async function getRevenueSeries(tenantId: string, days = 30): Promise<{ points: RevenuePoint[]; total: number }> {
  const now = new Date()
  const start = fromWib(toDayKey(addDays(now, -(days - 1))))
  const end = addDays(fromWib(toDayKey(now)), 1)
  const rows = await settledRevenue(tenantId, start, end)

  const totals = new Map<string, number>()
  for (const row of rows) {
    if (!row.paidAt) continue
    const key = toDayKey(row.paidAt)
    totals.set(key, (totals.get(key) ?? 0) + row.amount)
  }

  const points: RevenuePoint[] = []
  for (let offset = 0; offset < days; offset++) {
    const key = toDayKey(addDays(start, offset))
    points.push({ day: key, amount: totals.get(key) ?? 0 })
  }

  return { points, total: [...totals.values()].reduce((sum, value) => sum + value, 0) }
}

/** Kas masuk bulan kalender WIB berjalan. */
export async function getMonthRevenue(tenantId: string, now = new Date()): Promise<number> {
  const period = monthRangeWib(now)
  const rows = await settledRevenue(tenantId, period.start, period.end)
  return rows.reduce((sum, row) => sum + row.amount, 0)
}

function overlapDays(startsAt: Date, endsAt: Date, rangeStart: number, rangeEnd: number): number {
  const from = Math.max(startsAt.getTime(), rangeStart)
  const to = Math.min(endsAt.getTime(), rangeEnd)
  return to <= from ? 0 : Math.max(1, Math.round((to - from) / DAY_MS))
}

/**
 * Laporan pendapatan per kendaraan. Booking dihitung kalau masa sewanya menyentuh
 * rentang, sedangkan uangnya dihitung dari tanggal pembayaran — dua-duanya ditulis
 * apa adanya di halaman supaya angka tidak bikin bingung.
 */
export async function getVehicleRevenue(
  tenantId: string,
  rangeStart: Date,
  rangeEnd: Date
): Promise<VehicleRevenueReport> {
  const from = rangeStart.getTime()
  const to = rangeEnd.getTime()

  const [bookingRows, paymentRows, vehicles] = await Promise.all([
    prisma.booking.findMany({
      where: {
        tenantId,
        status: { in: ["CONFIRMED", "ONGOING", "COMPLETED"] },
        startsAt: { lt: rangeEnd },
        endsAt: { gte: rangeStart },
      },
      select: { vehicleId: true, startsAt: true, endsAt: true },
    }),
    settledRevenue(tenantId, rangeStart, rangeEnd),
    prisma.vehicle.findMany({
      where: { tenantId },
      select: { id: true, plate: true, brand: true, model: true, type: true },
    }),
  ])

  const vehicleById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]))
  type Row = VehicleRevenueReport["rows"][number]
  const summary = new Map<string, Row>()

  function rowFor(vehicleId: string): Row | null {
    const existing = summary.get(vehicleId)
    if (existing) return existing
    const vehicle = vehicleById.get(vehicleId)
    if (!vehicle) return null
    const fresh: Row = {
      vehicleId: vehicle.id,
      plate: vehicle.plate,
      brand: vehicle.brand,
      model: vehicle.model,
      type: vehicle.type,
      bookings: 0,
      days: 0,
      revenue: 0,
    }
    summary.set(vehicleId, fresh)
    return fresh
  }

  for (const booking of bookingRows) {
    const row = rowFor(booking.vehicleId)
    if (!row) continue
    row.bookings += 1
    row.days += overlapDays(booking.startsAt, booking.endsAt, from, to)
  }

  for (const payment of paymentRows) {
    const vehicleId = payment.booking?.vehicleId
    if (!vehicleId) continue
    const row = rowFor(vehicleId)
    if (!row) continue
    row.revenue += payment.amount
  }

  const rows = [...summary.values()].sort((a, b) => b.revenue - a.revenue || a.plate.localeCompare(b.plate))

  return {
    rows,
    totalRevenue: rows.reduce((sum, row) => sum + row.revenue, 0),
    totalDays: rows.reduce((sum, row) => sum + row.days, 0),
    bookingCount: rows.reduce((sum, row) => sum + row.bookings, 0),
  }
}

export type ReportRange = { start: Date; end: Date; label: string }

/**
 * Rentang laporan dari query string. Hanya tanggal format ISO yang diterima;
 * nilai lain jatuh ke bulan berjalan supaya halaman tidak pernah 500.
 */
export function parseReportRange(params: { dari?: string; sampai?: string }, now = new Date()): ReportRange {
  const period = monthRangeWib(now)
  const day = (value: string | undefined, fallback: Date): Date =>
    value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? fromWib(value) : fallback

  const start = day(params.dari, period.start)
  // Input "sampai" adalah hari terakhir yang ikut dihitung, jadi batas atasnya
  // awal hari berikutnya.
  const end = addDays(day(params.sampai, addDays(period.end, -1)), 1)

  if (end.getTime() <= start.getTime()) return { start, end, label: `${toDayKey(start)} – ${toDayKey(start)}` }
  return { start, end, label: `${toDayKey(start)} – ${toDayKey(addDays(end, -1))}` }
}
