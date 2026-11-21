import { z } from "zod"
import { parseRupiah } from "@/lib/format"

/** Kolom rupiah: menerima "150.000", "Rp 150.000", atau 150000. */
export function rupiah(label: string, options: { min?: number; max?: number } = {}) {
  const min = options.min ?? 0
  const max = options.max ?? 2_000_000_000
  return z
    .union([z.string(), z.number()])
    .transform((value) => (typeof value === "number" ? Math.round(value) : parseRupiah(value)))
    .refine((value) => value !== null, `${label} harus berupa angka rupiah`)
    .refine((value) => (value ?? 0) >= min, `${label} minimal Rp ${min.toLocaleString("id-ID")}`)
    .refine((value) => (value ?? 0) <= max, `${label} terlalu besar`)
    .transform((value) => value as number)
}

/** Kolom rupiah yang boleh dikosongkan (null). */
export function optionalRupiah(label: string) {
  return z
    .union([z.string(), z.number(), z.null()])
    .transform((value) => {
      if (value === null || value === "" || value === undefined) return null
      return typeof value === "number" ? Math.round(value) : parseRupiah(value)
    })
    .refine((value) => {
      if (value === null) return true
      return value >= 0
    }, `${label} harus berupa angka rupiah`)
}

export const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/
export const TIME_PATTERN = /^\d{2}:\d{2}$/

export const dayField = (label: string) =>
  z.string().regex(DAY_PATTERN, `${label} gunakan format tanggal (YYYY-MM-DD)`)

export const timeField = (label: string) =>
  z.string().regex(TIME_PATTERN, `${label} gunakan format jam (HH:mm)`)

export function optionalText(label: string, max = 500) {
  return z
    .union([z.string(), z.undefined(), z.null()])
    .transform((value) => (value ? String(value).trim() : ""))
    .refine((value) => value.length <= max, `${label} maksimal ${max} karakter`)
}

const TRUE_VALUES = new Set(["true", "1", "on", "ya"])

/** Checkbox dapat datang sebagai boolean atau string form ("on", "true"). */
export const boolField = z
  .union([z.boolean(), z.string()])
  .transform((value) =>
    typeof value === "boolean"
      ? value
      : TRUE_VALUES.has(String(value ?? "").toLowerCase().trim())
  )

export function intField(label: string, options: { min?: number; max?: number } = {}) {
  const min = options.min ?? 0
  const max = options.max ?? 1_000_000_000
  return z
    .union([z.string(), z.number()])
    .transform((value) => {
      const text = typeof value === "number" ? String(value) : String(value ?? "").trim()
      if (!text) return Number.NaN
      return Number(text.replace(/[^\d-]/g, ""))
    })
    .refine((value) => Number.isInteger(value), `${label} harus bilangan bulat`)
    .refine((value) => value >= min && value <= max, `${label} harus antara ${min} dan ${max}`)
}

export function optionalIntField(label: string, options: { min?: number; max?: number } = {}) {
  const min = options.min ?? 0
  const max = options.max ?? 1_000_000_000
  return z
    .union([z.string(), z.number(), z.null()])
    .transform((value) => {
      if (value === null || value === undefined) return null
      const text = typeof value === "number" ? String(value) : String(value).trim()
      if (!text) return null
      return Number(text.replace(/[^\d-]/g, ""))
    })
    .refine((value) => {
      if (value === null) return true
      return Number.isInteger(value) && value >= min && value <= max
    }, `${label} harus antara ${min} dan ${max}`)
}
