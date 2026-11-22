import { z } from "zod"
import { boolField } from "./common"
import { refineTenantSlug, tenantFieldLabels, tenantProfileShape } from "./tenant"

export const PLAN_CODES = ["STARTER", "PRO", "BUSINESS"] as const

/**
 * Pendaftaran tenant oleh operator: identitas rental (sama seperti wizard
 * self-serve) ditambah akun yang akan menjadi pemilik datanya.
 */
export const platformTenantInput = z
  .object({
    ...tenantProfileShape,
    ownerName: z
      .string()
      .trim()
      .min(2, "Nama pemilik minimal 2 karakter")
      .max(60, "Nama pemilik maksimal 60 karakter"),
    ownerEmail: z
      .string()
      .trim()
      .transform((value) => value.toLowerCase())
      .refine((value) => /^\S+@\S+\.\S+$/.test(value), "Email pemilik tidak valid"),
    planCode: z.enum(PLAN_CODES, "Pilih paket langganan"),
    withTrial: boolField,
  })
  .superRefine(refineTenantSlug)

export type PlatformTenantInput = z.infer<typeof platformTenantInput>

export const platformTenantFieldLabels: Record<string, string> = {
  ...tenantFieldLabels,
  ownerName: "Nama pemilik",
  ownerEmail: "Email pemilik",
  planCode: "Paket langganan",
  withTrial: "Masa uji",
}
