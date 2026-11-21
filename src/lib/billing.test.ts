import { describe, expect, it } from "vitest"
import { addDays, formatDateId, fromWib, toDayKey, toTimeKey } from "@/lib/datetime"
import {
  addMonthsWib,
  coversPeriod,
  daysToRenewal,
  invoiceDueAt,
  invoiceMonthRange,
  invoiceNumberFor,
  nextBillingPeriod,
  planPrice,
  renewalMilestone,
} from "./billing"

describe("addMonthsWib", () => {
  it("memangkas hari ke ujung bulan target saat bulan berikutnya lebih pendek", () => {
    expect(toDayKey(addMonthsWib(fromWib("2027-01-31", "09:00"), 1))).toBe("2027-02-28")
  })

  it("menghormati tahun kabisat", () => {
    expect(toDayKey(addMonthsWib(fromWib("2028-01-31", "09:00"), 1))).toBe("2028-02-29")
  })

  it("mewarisi jam WIB tanggal acuan", () => {
    const shifted = addMonthsWib(fromWib("2026-11-21", "23:30"), 1)
    expect(toDayKey(shifted)).toBe("2026-12-21")
    expect(toTimeKey(shifted)).toBe("23:30")
  })

  it("berputar kembali ke tahun yang sama setelah dua belas bulan", () => {
    expect(toDayKey(addMonthsWib(fromWib("2026-03-15", "08:00"), 12))).toBe("2027-03-15")
  })
})

describe("nextBillingPeriod", () => {
  it("periode baru dimulai tepat saat periode lama habis", () => {
    const end = fromWib("2026-12-05", "10:00")
    const period = nextBillingPeriod(end)
    expect(period.start.getTime()).toBe(end.getTime())
    expect(formatDateId(period.end, "d MMM yyyy HH:mm")).toBe("5 Jan 2027 10:00")
  })
})

describe("daysToRenewal dan renewalMilestone", () => {
  const now = fromWib("2026-11-21", "12:00")

  it("menghitung hari kalender, bukan selisih jam", () => {
    expect(daysToRenewal(fromWib("2026-11-22", "06:00"), now)).toBe(1)
    expect(daysToRenewal(fromWib("2026-11-21", "13:00"), now)).toBe(0)
    expect(daysToRenewal(fromWib("2026-11-19", "08:00"), now)).toBe(-2)
  })

  it("hanya menyebut hari pengingat 7, 3, dan 1", () => {
    expect(renewalMilestone(addDays(now, 7), now)).toBe(7)
    expect(renewalMilestone(addDays(now, 3), now)).toBe(3)
    expect(renewalMilestone(addDays(now, 1), now)).toBe(1)
    expect(renewalMilestone(addDays(now, 5), now)).toBeNull()
    expect(renewalMilestone(addDays(now, 0), now)).toBeNull()
    expect(renewalMilestone(addDays(now, -4), now)).toBeNull()
  })
})

describe("nomor invoice", () => {
  it("memakai awalan bulan periode berjalan", () => {
    expect(invoiceNumberFor(fromWib("2026-11-21", "09:00"), 1)).toBe("INV-2611-0001")
    expect(invoiceNumberFor(fromWib("2026-11-21", "09:00"), 12)).toBe("INV-2611-0012")
  })

  it("nomor nol dinaikkan ke satu agar tidak menghasilkan urut kosong", () => {
    expect(invoiceNumberFor(fromWib("2026-12-01", "00:00"), 0)).toBe("INV-2612-0001")
  })

  it("rentang pencarian bulan membentang dari tanggal satu sampai awal bulan berikut", () => {
    const range = invoiceMonthRange(fromWib("2026-11-21", "09:00"))
    expect(toDayKey(range.gte)).toBe("2026-11-01")
    expect(toDayKey(range.lt)).toBe("2026-12-01")
  })

  it("tenggat bayar jatuh tiga hari setelah periode baru", () => {
    const start = fromWib("2026-11-21", "09:00")
    expect(toDayKey(invoiceDueAt(start))).toBe("2026-11-24")
  })
})

describe("coversPeriod", () => {
  const period = { start: fromWib("2026-12-01", "08:00"), end: fromWib("2027-01-01", "08:00") }

  it("mencocokkan invoice dengan periode yang sama persis", () => {
    expect(coversPeriod({ periodStart: period.start, periodEnd: period.end }, period)).toBe(true)
    expect(coversPeriod({ periodStart: period.start, periodEnd: addDays(period.end, 1) }, period)).toBe(false)
  })
})

describe("planPrice", () => {
  it("tidak pernah mengembalikan harga negatif", () => {
    expect(planPrice({ priceMonthly: 249_000 })).toBe(249_000)
    expect(planPrice({ priceMonthly: -5 })).toBe(0)
  })
})
