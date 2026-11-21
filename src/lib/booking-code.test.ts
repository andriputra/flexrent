import { describe, expect, it } from "vitest"
import { fromWib } from "./datetime"
import { bookingCodePrefix, bookingMonthKey, buildBookingCode } from "./booking-code"

describe("kode booking BR-YYMM-####", () => {
  it("memakai bulan WIB tanggal ambil", () => {
    const startsAt = fromWib("2026-11-21", "09:00")
    expect(bookingMonthKey(startsAt)).toBe("2611")
    expect(buildBookingCode(startsAt, 42)).toBe("BR-2611-0042")
    expect(bookingCodePrefix(startsAt)).toBe("BR-2611-")
  })

  it("ikut berganti bulan, bukan tahun server (UTC)", () => {
    // 31 Des 23.00 WIB = 1 Jan 00.00 UTC; kode harus tetap bulan Desember WIB.
    const lateNight = fromWib("2026-12-31", "23:00")
    expect(bookingMonthKey(lateNight)).toBe("2612")
    expect(buildBookingCode(lateNight, 7)).toBe("BR-2612-0007")
  })

  it("menjepit nomor urut agar tidak menghasilkan kode aneh", () => {
    const startsAt = fromWib("2026-01-05", "08:00")
    expect(buildBookingCode(startsAt, 0)).toBe("BR-2601-0001")
    expect(buildBookingCode(startsAt, -3)).toBe("BR-2601-0001")
    expect(buildBookingCode(startsAt, 1234)).toBe("BR-2601-1234")
    expect(buildBookingCode(startsAt, 99999)).toBe("BR-2601-99999")
  })
})
