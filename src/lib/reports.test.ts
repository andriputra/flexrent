import { describe, expect, it } from "vitest"
import type { VehicleRevenueReport, VehicleRevenueRow } from "./reports"
import { revenuePerDay, revenueShare, vehicleRevenueCsv } from "./reports"

function row(over: Partial<VehicleRevenueRow> & Pick<VehicleRevenueRow, "revenue">): VehicleRevenueRow {
  return {
    vehicleId: "v1",
    plate: "B 1234 ABC",
    brand: "Honda",
    model: "Vario 150",
    type: "MOTOR",
    bookings: 1,
    days: 2,
    ...over,
  }
}

function report(rows: VehicleRevenueRow[]): VehicleRevenueReport {
  return {
    rows,
    totalRevenue: rows.reduce((sum, item) => sum + item.revenue, 0),
    totalDays: rows.reduce((sum, item) => sum + item.days, 0),
    bookingCount: rows.reduce((sum, item) => sum + item.bookings, 0),
  }
}

describe("laporan pendapatan per kendaraan", () => {
  it("rata-rata per hari nol saat kendaraan belum punya hari sewa", () => {
    expect(revenuePerDay(row({ revenue: 300_000, days: 3 }))).toBe(100_000)
    expect(revenuePerDay(row({ revenue: 300_000, days: 0 }))).toBe(0)
  })

  it("kontribusi dipakai sebagai pecahan, bukan persen", () => {
    const data = report([row({ revenue: 250_000 }), row({ revenue: 750_000 })])
    expect(revenueShare(data.rows[0], data.totalRevenue)).toBeCloseTo(0.25)
    expect(revenueShare(data.rows[1], data.totalRevenue)).toBeCloseTo(0.75)
    expect(revenueShare(row({ revenue: 100_000 }), 0)).toBe(0)
  })

  it("baris total CSV menutup jumlah booking, hari, dan pendapatan", () => {
    const data = report([row({ revenue: 400_000, days: 4, bookings: 2 })])
    const csv = vehicleRevenueCsv(data, "1 Nov 2026 – 30 Nov 2026", "Maju Rental")
    expect(csv[csv.length - 1]).toEqual(["TOTAL", "1 kendaraan", "", 2, 4, 400_000, 100_000, 100])
    expect(csv[0]).toContain("Laporan pendapatan per kendaraan")
    expect(csv.flat()).toContain("Maju Rental")
  })

  it("kolom kontribusi CSV menulis persen bulat, bukan pecahan", () => {
    const data = report([row({ revenue: 250_000 }), row({ revenue: 750_000 })])
    const csv = vehicleRevenueCsv(data, "1 Nov 2026 – 30 Nov 2026", "Maju Rental")
    const shares = csv.filter((cells) => cells[0] === "B 1234 ABC").map((cells) => cells[7])
    expect(shares).toEqual([25, 75])
  })

  it("baris total tanpa pendapatan tidak mengklaim 100%", () => {
    const data = report([row({ revenue: 0, days: 0 })])
    const csv = vehicleRevenueCsv(data, "1 Des 2026 – 31 Des 2026", "Maju Rental")
    expect(csv[csv.length - 1]).toEqual(["TOTAL", "1 kendaraan", "", 1, 0, 0, 0, 0])
  })

  it("kendaraan tanpa pendapatan tetap ikut tertulis", () => {
    const data = report([row({ revenue: 0, days: 0, bookings: 0 })])
    const csv = vehicleRevenueCsv(data, "1 Des 2026 – 31 Des 2026", "Maju Rental")
    const barisKendaraan = csv.find((cells) => cells[0] === "B 1234 ABC")
    expect(barisKendaraan).toEqual(["B 1234 ABC", "Honda Vario 150", "Motor", 0, 0, 0, 0, 0])
  })
})
