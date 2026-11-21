import { describe, expect, it } from "vitest"
import { parseCatalogQuery } from "./public"

describe("parseCatalogQuery", () => {
  it("memakai default kosong saat parameter tidak ada", () => {
    expect(parseCatalogQuery({})).toEqual({
      ambil: "",
      kembali: "",
      jenis: "",
      transmisi: "",
      min: 0,
      maks: 0,
    })
  })

  it("menerima rentang tanggal yang urut", () => {
    const query = parseCatalogQuery({ ambil: "2026-12-01", kembali: "2026-12-05", jenis: "Motor" })
    expect(query.ambil).toBe("2026-12-01")
    expect(query.kembali).toBe("2026-12-05")
    expect(query.jenis).toBe("motor")
  })

  it("membuang tanggal terbalik, format salah, dan nilai iseng", () => {
    expect(parseCatalogQuery({ ambil: "2026-12-05", kembali: "2026-12-01" })).toMatchObject({
      ambil: "",
      kembali: "",
    })
    expect(parseCatalogQuery({ ambil: "besok", kembali: "2026-12-05" })).toMatchObject({ ambil: "" })
    expect(parseCatalogQuery({ jenis: "helikopter", transmisi: "matic" })).toMatchObject({
      jenis: "",
      transmisi: "matic",
    })
    expect(parseCatalogQuery({ maks: "200.000 rupiah" })).toMatchObject({ maks: 200000 })
    expect(parseCatalogQuery({ maks: "99999999999999" })).toMatchObject({ maks: 2_000_000_000 })
  })

  it("mengambil nilai pertama bila parameter berulang", () => {
    expect(parseCatalogQuery({ jenis: ["mobil", "motor"] })).toMatchObject({ jenis: "mobil" })
  })
})
