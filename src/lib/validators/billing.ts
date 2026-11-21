import { z } from "zod"
import { boolField, optionalText, rupiah } from "./common"

export const invoicePaymentInput = z.object({
  invoiceId: z.string().min(1, "Tagihan tidak dikenali"),
  amount: rupiah("Jumlah dibayar", { min: 1 }),
  method: z.enum(["CASH", "BANK_TRANSFER", "OTHER"], "Pilih metode pembayaran"),
  refCode: optionalText("Nomor referensi", 60),
  notes: optionalText("Catatan", 200),
})

export const invoicePaymentFieldLabels: Record<string, string> = {
  amount: "Jumlah dibayar",
  method: "Metode",
  refCode: "Nomor referensi",
  notes: "Catatan",
}

export const planChangeInput = z.object({
  code: z.enum(["STARTER", "PRO", "BUSINESS"], "Pilih paket"),
})

export const cancelAtPeriodEndInput = z.object({
  cancel: boolField,
})

export type InvoicePaymentInput = z.infer<typeof invoicePaymentInput>
