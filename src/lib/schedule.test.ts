import { describe, expect, it } from "vitest"
import { findOverlapping, hasOverlap, isDayBlocked, overlaps } from "./schedule"

const at = (iso: string) => new Date(iso)

describe("overlaps", () => {
  it("menganggap batas atas eksklusif seperti constraint database", () => {
    const selesai = { startsAt: at("2026-11-20T08:00:00+07:00"), endsAt: at("2026-11-21T10:00:00+07:00") }
    const berikutnya = { startsAt: at("2026-11-21T10:00:00+07:00"), endsAt: at("2026-11-23T10:00:00+07:00") }
    expect(overlaps(selesai, berikutnya)).toBe(false)
  })

  it("menandai bentrok saat rentang saling menimpa", () => {
    const a = { startsAt: at("2026-11-20T08:00:00+07:00"), endsAt: at("2026-11-22T08:00:00+07:00") }
    const b = { startsAt: at("2026-11-21T08:00:00+07:00"), endsAt: at("2026-11-23T08:00:00+07:00") }
    expect(overlaps(a, b)).toBe(true)
  })

  it("menandai bentrok untuk rentang yang sama persis", () => {
    const a = { startsAt: at("2026-11-20T08:00:00+07:00"), endsAt: at("2026-11-21T08:00:00+07:00") }
    expect(overlaps(a, { ...a })).toBe(true)
  })

  it("menandai bentrok untuk rentang singkat di dalam rentang panjang", () => {
    const panjang = { startsAt: at("2026-11-20T00:00:00+07:00"), endsAt: at("2026-11-25T00:00:00+07:00") }
    const singkat = { startsAt: at("2026-11-22T00:00:00+07:00"), endsAt: at("2026-11-22T02:00:00+07:00") }
    expect(overlaps(panjang, singkat)).toBe(true)
    expect(overlaps(singkat, panjang)).toBe(true)
  })

  it("menyaring daftar rentang yang bentrok", () => {
    const list = [
      { id: "1", startsAt: at("2026-11-18T08:00:00+07:00"), endsAt: at("2026-11-19T08:00:00+07:00") },
      { id: "2", startsAt: at("2026-11-21T08:00:00+07:00"), endsAt: at("2026-11-22T08:00:00+07:00") },
    ]
    const kandidat = { startsAt: at("2026-11-21T07:00:00+07:00"), endsAt: at("2026-11-21T18:00:00+07:00") }
    expect(hasOverlap(kandidat, list)).toBe(true)
    expect(findOverlapping(kandidat, list).map((item) => item.id)).toEqual(["2"])
  })

  it("memblokir tanggal kalender yang tersentuh rentang aktif", () => {
    const list = [{ startsAt: at("2026-11-21T18:00:00+07:00"), endsAt: at("2026-11-22T06:00:00+07:00") }]
    expect(
      isDayBlocked(at("2026-11-21T00:00:00+07:00"), at("2026-11-22T00:00:00+07:00"), list)
    ).toBe(true)
    expect(
      isDayBlocked(at("2026-11-22T00:00:00+07:00"), at("2026-11-23T00:00:00+07:00"), list)
    ).toBe(true)
    expect(
      isDayBlocked(at("2026-11-24T00:00:00+07:00"), at("2026-11-25T00:00:00+07:00"), list)
    ).toBe(false)
  })
})
