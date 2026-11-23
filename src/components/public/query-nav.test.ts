import { describe, expect, it } from "vitest"
import { buildCatalogHref } from "./query-nav"
import { parseCatalogQuery, type CatalogQuery } from "@/lib/validators/public"

const kosong: CatalogQuery = {
  ambil: "",
  kembali: "",
  jenis: "",
  transmisi: "",
  min: 0,
  maks: 0,
}

const baca = (href: string) =>
  parseCatalogQuery(Object.fromEntries(new URL(href, "https://flexrent.test").searchParams))

describe("buildCatalogHref", () => {
  it("menyaring jenis tanpa menghapus transmisi dan harga yang sudah dipakai", () => {
    const href = buildCatalogHref("bandung-ride", {
      ...kosong,
      transmisi: "matic",
      min: 50000,
      jenis: "motor",
    })
    expect(href).toBe("/bandung-ride?jenis=motor&transmisi=matic&min=50000")
  })

  it("filter yang kosong tidak ikut masuk URL", () => {
    expect(buildCatalogHref("bandung-ride", kosong)).toBe("/bandung-ride")
    expect(buildCatalogHref("bandung-ride", { ...kosong, min: 0, maks: 0 })).toBe("/bandung-ride")
  })

  it("rentang yang lengkap dan urut kembali terbaca utuh di server", () => {
    const href = buildCatalogHref("bandung-ride", {
      ...kosong,
      ambil: "2026-12-01",
      kembali: "2026-12-05",
    })
    expect(baca(href)).toMatchObject({ ambil: "2026-12-01", kembali: "2026-12-05" })
  })

  it("rentang separuh tetap di kotak tanggal tetapi tidak menyaring apa pun", () => {
    const href = buildCatalogHref("bandung-ride", { ...kosong, ambil: "2026-12-01" })
    expect(href).toContain("ambil=2026-12-01")
    expect(baca(href)).toMatchObject({ ambil: "", kembali: "" })
  })

  it("tanggal terbalik tidak mengubah kendaraan yang ditampilkan", () => {
    const href = buildCatalogHref("bandung-ride", {
      ...kosong,
      ambil: "2026-12-05",
      kembali: "2026-12-01",
      jenis: "mobil",
    })
    expect(baca(href)).toMatchObject({ ambil: "", kembali: "", jenis: "mobil" })
  })
})
