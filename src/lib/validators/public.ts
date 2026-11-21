import { z } from "zod"
import { DAY_PATTERN } from "./common"

const KEYS = ["ambil", "kembali", "jenis", "transmisi", "min", "maks"] as const

/** Parameter URL bisa hilang atau berulang; disamakan dulu menjadi string semua. */
function readKeys(raw: Record<string, string | string[] | undefined>): Record<(typeof KEYS)[number], string> {
  const out: Record<(typeof KEYS)[number], string> = {
    ambil: "",
    kembali: "",
    jenis: "",
    transmisi: "",
    min: "",
    maks: "",
  }
  for (const key of KEYS) {
    const value = raw[key]
    out[key] = (Array.isArray(value) ? value[0] : value) ?? ""
  }
  return out
}

const dayParam = z.string().transform((value) => {
  const text = value.trim()
  return DAY_PATTERN.test(text) ? text : ""
})

const enumParam = <T extends readonly string[]>(allowed: T) =>
  z.string().transform((value) => {
    const text = value.trim().toLowerCase()
    return allowed.includes(text) ? text : ""
  })

const amountParam = z.string().transform((value) => {
  const digits = value.replace(/[^\d]/g, "")
  if (!digits) return 0
  return Math.min(Number(digits), 2_000_000_000)
})

export const catalogQueryInput = z
  .object({
    ambil: dayParam,
    kembali: dayParam,
    jenis: enumParam(["", "motor", "mobil"] as const),
    transmisi: enumParam(["", "matic", "manual"] as const),
    min: amountParam,
    maks: amountParam,
  })
  .transform((value) => {
    const rangeOk = Boolean(value.ambil && value.kembali && value.kembali > value.ambil)
    return {
      jenis: value.jenis as "" | "motor" | "mobil",
      transmisi: value.transmisi as "" | "matic" | "manual",
      min: value.min,
      maks: value.maks,
      // Rentang tanggal hanya dipakai kalau lengkap dan urut.
      ambil: rangeOk ? value.ambil : "",
      kembali: rangeOk ? value.kembali : "",
    }
  })

export type CatalogQuery = z.infer<typeof catalogQueryInput>

export function parseCatalogQuery(raw: Record<string, string | string[] | undefined>): CatalogQuery {
  return catalogQueryInput.parse(readKeys(raw))
}
