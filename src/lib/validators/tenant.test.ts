import { describe, expect, it } from "vitest"
import { openingHoursInput } from "./tenant"

function rows(over: Record<string, Partial<{ open: string; close: string; closed: boolean }>> = {}) {
  return ["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"].map((day) => ({
    day,
    open: "08:00",
    close: "17:00",
    closed: false,
    ...over[day],
  }))
}

describe("validasi jam operasional", () => {
  it("tujuh hari dengan jam runtut diterima", () => {
    expect(openingHoursInput.safeParse({ rows: rows() }).success).toBe(true)
  })

  it("hari libur boleh dicentang tanpa mengubah jam", () => {
    expect(openingHoursInput.safeParse({ rows: rows({ minggu: { closed: true } }) }).success).toBe(true)
  })

  it("jam tutup harus setelah jam buka, dengan path per hari", () => {
    const parsed = openingHoursInput.safeParse({ rows: rows({ selasa: { open: "10:00", close: "09:00" } }) })
    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      expect(parsed.error.issues[0].path).toEqual(["rows", 1, "close"])
      expect(parsed.error.issues[0].message).toBe("Jam tutup harus setelah jam buka")
    }
  })

  it("kurang dari tujuh hari ditolak", () => {
    const parsed = openingHoursInput.safeParse({ rows: rows().slice(0, 6) })
    expect(parsed.success).toBe(false)
    if (!parsed.success) expect(parsed.error.issues[0].message).toContain("tujuh hari")
  })
})
