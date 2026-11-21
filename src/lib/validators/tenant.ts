import { z } from "zod"
import { isReservedSlug, isValidSlug, slugify } from "@/lib/slug"
import { normalizePhone } from "@/lib/format"
import { WEEK_DAYS } from "@/lib/opening-hours"
import { boolField, optionalText, timeField } from "./common"

const profileShape = {
  name: z
    .string()
    .trim()
    .min(3, "Nama rental minimal 3 karakter")
    .max(60, "Nama rental maksimal 60 karakter"),
  slugInput: z.string().trim().max(40, "Slug maksimal 40 karakter"),
  city: z.string().trim().min(2, "Kota wajib diisi").max(60, "Kota maksimal 60 karakter"),
  phone: z
    .string()
    .transform((value) => normalizePhone(value))
    .refine((value) => /^0\d{8,15}$/.test(value), "Nomor WhatsApp tidak valid (contoh 081234567890)"),
  address: optionalText("Alamat", 200),
  email: z
    .union([z.string(), z.undefined(), z.null()])
    .transform((value) => (value ? String(value).trim() : ""))
    .refine((value) => value === "" || /^\S+@\S+\.\S+$/.test(value), "Email tidak valid"),
}

/** Nama alamat publik divalidasi setelah slug hasil olahan dibentuk. */
function refineSlug(value: { name: string; slugInput: string }, ctx: z.RefinementCtx) {
  const slug = slugify(value.slugInput || value.name)
  if (!isValidSlug(slug)) {
    ctx.addIssue({
      code: "custom",
      path: ["slugInput"],
      message: "Slug hanya huruf kecil, angka, dan tanda hubung (3-40 karakter)",
    })
  } else if (isReservedSlug(slug)) {
    ctx.addIssue({
      code: "custom",
      path: ["slugInput"],
      message: `Slug "${slug}" dipakai sistem, pilih nama lain`,
    })
  }
}

export const tenantOnboardingInput = z.object(profileShape).superRefine(refineSlug)

export type TenantOnboardingInput = z.infer<typeof tenantOnboardingInput>

/** Formulir pengaturan: sama seperti onboarding plus tagline halaman publik. */
export const tenantProfileInput = z
  .object({ ...profileShape, tagline: optionalText("Tagline", 120) })
  .superRefine(refineSlug)

export type TenantProfileInput = z.infer<typeof tenantProfileInput>

export const tenantFieldLabels: Record<string, string> = {
  name: "Nama rental",
  slugInput: "Alamat halaman publik",
  city: "Kota",
  phone: "Nomor WhatsApp",
  address: "Alamat",
  email: "Email",
  tagline: "Tagline",
}

export const termsInput = z.object({
  terms: optionalText("Syarat sewa", 2000),
})

const openingHourRow = z.object({
  day: z.enum(WEEK_DAYS, "Hari tidak dikenal"),
  open: timeField("Jam buka"),
  close: timeField("Jam tutup"),
  closed: boolField,
})

// Refine duduk di objek, bukan di array: path custom yang diberikan sudah
// relatif terhadap objek, jadi "rows[indeks].close" terbaca utuh oleh aksi.
export const openingHoursInput = z
  .object({
    rows: z.array(openingHourRow).length(7, "Jam operasional harus berisi tujuh hari"),
  })
  .superRefine((value, ctx) => {
    if (!Array.isArray(value.rows)) return
    value.rows.forEach((row, index) => {
      if (row.closed || row.close > row.open) return
      ctx.addIssue({
        code: "custom",
        message: "Jam tutup harus setelah jam buka",
        path: ["rows", index, "close"],
      })
    })
  })

export type OpeningHoursInput = z.infer<typeof openingHoursInput>

export const staffInviteInput = z.object({
  email: z.string().trim().min(1, "Email wajib diisi").email("Email tidak valid"),
  role: z.enum(["ADMIN", "STAFF"], "Pilih peran staf"),
  jobTitle: optionalText("Jabatan", 60),
})

export const staffInviteFieldLabels: Record<string, string> = {
  email: "Email staf",
  role: "Peran",
  jobTitle: "Jabatan",
}
