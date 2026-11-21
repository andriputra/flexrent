import { z } from "zod"
import { boolField, optionalText } from "./common"

export const customerBlacklistInput = z
  .object({
    id: z.string().min(1, "Pelanggan tidak ditemukan"),
    isBlacklisted: boolField,
    reason: optionalText("Alasan", 200),
  })
  .superRefine((value, ctx) => {
    if (value.isBlacklisted && !value.reason) {
      ctx.addIssue({ code: "custom", path: ["reason"], message: "Isi alasan supaya staf lain tahu" })
    }
  })

export const documentVerificationInput = z.object({
  documentId: z.string().min(1, "Dokumen tidak ditemukan"),
  isVerified: boolField,
})

export const customerFieldLabels: Record<string, string> = {
  id: "Pelanggan",
  isBlacklisted: "Daftar hitam",
  reason: "Alasan",
  documentId: "Dokumen",
  isVerified: "Status verifikasi",
}
