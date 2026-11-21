import type { VehicleType } from "@prisma/client"

/** Satu baris laporan pendapatan per kendaraan untuk satu rentang tanggal. */
export type VehicleRevenueRow = {
  vehicleId: string
  plate: string
  brand: string
  model: string
  type: VehicleType
  /** Jumlah booking yang masa sewanya menyentuh rentang laporan. */
  bookings: number
  /** Hari sewa di dalam rentang, dipakai untuk rata-rata per hari. */
  days: number
  /** Kas masuk dari pembayaran RENTAL yang SETTLED. */
  revenue: number
}

export type VehicleRevenueReport = {
  rows: VehicleRevenueRow[]
  totalRevenue: number
  totalDays: number
  bookingCount: number
}

export function revenuePerDay(row: Pick<VehicleRevenueRow, "revenue" | "days">): number {
  return row.days > 0 ? Math.round(row.revenue / row.days) : 0
}

/** Bagian pendapatan satu kendaraan dari total, 0..1. */
export function revenueShare(row: Pick<VehicleRevenueRow, "revenue">, total: number): number {
  return total > 0 ? row.revenue / total : 0
}

/**
 * Isi file CSV laporan. Kolomnya teks biasa dan angkanya polos (tanpa pemisah
 * ribuan) supaya langsung bisa dihitung ulang di spreadsheet.
 */
export function vehicleRevenueCsv(
  report: VehicleRevenueReport,
  rangeLabel: string,
  tenantName: string
): (string | number)[][] {
  const header = ["Laporan pendapatan per kendaraan"]
  const meta = ["Rental", tenantName, "", "Periode", rangeLabel]
  const columns = [
    "Plat nomor",
    "Kendaraan",
    "Tipe",
    "Jumlah booking",
    "Hari sewa",
    "Pendapatan (Rp)",
    "Rata-rata per hari (Rp)",
    "Bagian dari total (%)",
  ]

  const rows = report.rows.map((row) => [
    row.plate,
    `${row.brand} ${row.model}`.trim(),
    row.type === "MOTOR" ? "Motor" : "Mobil",
    row.bookings,
    row.days,
    row.revenue,
    revenuePerDay(row),
    Math.round(revenueShare(row, report.totalRevenue) * 100),
  ])

  const totals: (string | number)[] = [
    "TOTAL",
    `${report.rows.length} kendaraan`,
    "",
    report.bookingCount,
    report.totalDays,
    report.totalRevenue,
    revenuePerDay({ revenue: report.totalRevenue, days: report.totalDays }),
    report.totalRevenue > 0 ? 100 : 0,
  ]

  return [header, meta, [], columns, ...rows, [], totals]
}
