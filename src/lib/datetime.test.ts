import { describe, expect, it } from "vitest"
import {
  addDays,
  addWibDays,
  diffInCalendarDays,
  formatDateId,
  formatDateTimeId,
  fromWib,
  rentalDays,
  startOfMonthWib,
  toDayKey,
  toTimeKey,
} from "./datetime"

describe("konversi WIB", () => {
  it("memakai tanggal kalender Jakarta, bukan zona mesin", () => {
    // 20 Nov 17:00 UTC = 21 Nov 00:00 WIB
    const instant = new Date("2026-11-20T17:00:00Z")
    expect(toDayKey(instant)).toBe("2026-11-21")
    expect(toTimeKey(instant)).toBe("00:00")
  })

  it("membentuk kembali instant dari isian tanggal + jam", () => {
    expect(fromWib("2026-11-21", "00:00").toISOString()).toBe("2026-11-20T17:00:00.000Z")
    expect(fromWib("2026-11-21").toISOString()).toBe("2026-11-21T01:00:00.000Z")
  })

  it("round-trip melalui helper", () => {
    const date = fromWib("2027-02-28", "21:30")
    expect(toDayKey(date)).toBe("2027-02-28")
    expect(toTimeKey(date)).toBe("21:30")
  })
})

describe("durasi sewa", () => {
  it("menghitung hari dari jam ke jam", () => {
    const startsAt = fromWib("2026-11-21", "08:00")
    expect(rentalDays(startsAt, fromWib("2026-11-23", "08:00"))).toBe(2)
    expect(rentalDays(startsAt, fromWib("2026-11-23", "07:00"))).toBe(2)
    expect(rentalDays(startsAt, fromWib("2026-11-23", "09:00"))).toBe(2)
  })

  it("membedakan selisih tanggal kalender", () => {
    expect(diffInCalendarDays(fromWib("2026-11-21"), fromWib("2026-11-23"))).toBe(2)
    expect(diffInCalendarDays(fromWib("2026-11-21"), fromWib("2026-11-21"))).toBe(0)
  })
})

describe("penanggalan", () => {
  it("menambah hari melewati batas bulan dan tahun", () => {
    expect(addWibDays("2026-11-30", 1)).toBe("2026-12-01")
    expect(addWibDays("2026-12-31", 1)).toBe("2027-01-01")
    expect(toDayKey(addDays(fromWib("2026-11-21"), -1))).toBe("2026-11-20")
  })

  it("memformat tanggal dengan nama Indonesia", () => {
    const tanggal = fromWib("2026-11-21", "14:05")
    expect(formatDateId(tanggal, "EEEE, d MMMM yyyy")).toBe("Sabtu, 21 November 2026")
    expect(formatDateId(tanggal, "EEE, d MMM yyyy")).toBe("Sab, 21 Nov 2026")
    expect(formatDateId(tanggal, "HH:mm")).toBe("14:05")
    expect(formatDateTimeId(tanggal)).toBe("Sab, 21 Nov 2026 · 14:05")
  })

  it("mengembalikan awal bulan WIB", () => {
    expect(toDayKey(startOfMonthWib(fromWib("2026-11-21", "23:00")))).toBe("2026-11-01")
    expect(toTimeKey(startOfMonthWib(fromWib("2026-11-21")))).toBe("00:00")
  })
})
