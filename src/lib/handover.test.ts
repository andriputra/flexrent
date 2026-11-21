import { describe, expect, it } from "vitest"
import { fromWib } from "@/lib/datetime"
import {
  fuelDropLabel,
  fuelDropQuarters,
  isFuelLevel,
  isPhotoPosition,
  lateDays,
  missingPhotoPositions,
  odometerDelta,
} from "./handover"

describe("lateDays", () => {
  it("kembali sore di hari yang sama tidak didenda", () => {
    expect(lateDays(fromWib("2026-11-22", "08:00"), fromWib("2026-11-22", "21:00"))).toBe(0)
  })

  it("lewat tengah malam dihitung satu hari meski selisihnya kurang 24 jam", () => {
    expect(lateDays(fromWib("2026-11-22", "08:00"), fromWib("2026-11-23", "06:00"))).toBe(1)
  })

  it("tepat waktu atau lebih awal bernilai nol", () => {
    expect(lateDays(fromWib("2026-11-22", "08:00"), fromWib("2026-11-21", "08:00"))).toBe(0)
  })
})

describe("fuelDropQuarters", () => {
  it("mengukur berkurangnya tangki dalam perempat", () => {
    expect(fuelDropQuarters("FULL", "HALF")).toBe(2)
    expect(fuelDropQuarters("HALF", "FULL")).toBe(0)
    expect(fuelDropQuarters(null, "FULL")).toBe(0)
  })

  it("memberi label yang dimengerti staf", () => {
    expect(fuelDropLabel(fuelDropQuarters("THREE_QUARTER", "EMPTY"))).toBe("Bahan bakar berkurang 3/4 tangki")
    expect(fuelDropLabel(0)).toBeNull()
  })
})

describe("odometerDelta", () => {
  it("membutuhkan kedua odometer", () => {
    expect(odometerDelta(12_000, null)).toBeNull()
    expect(odometerDelta(null, 12_500)).toBeNull()
  })

  it("jarak mundur tidak menghasilkan angka negatif", () => {
    expect(odometerDelta(12_500, 12_000)).toBe(0)
    expect(odometerDelta(12_000, 12_500)).toBe(500)
  })
})

describe("missingPhotoPositions", () => {
  it("menyebut posisi yang belum difoto", () => {
    expect(missingPhotoPositions(["FRONT", "BACK"])).toEqual(["LEFT", "RIGHT", "DASHBOARD"])
    expect(missingPhotoPositions(["FRONT", "BACK", "LEFT", "RIGHT", "DASHBOARD"])).toEqual([])
  })
})

describe("penjaga nilai form", () => {
  it("menerima enum yang ada dan menolak sisanya", () => {
    expect(isFuelLevel("THREE_QUARTER")).toBe(true)
    expect(isFuelLevel("TIGA_PEREMPAT")).toBe(false)
    expect(isPhotoPosition("DASHBOARD")).toBe(true)
    expect(isPhotoPosition("ATAP")).toBe(false)
  })
})
