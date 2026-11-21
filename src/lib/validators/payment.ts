import { z } from "zod"
import { optionalText, rupiah } from "./common"

export const PAYMENT_KINDS = ["RENTAL", "DEPOSIT"] as const
export const MANUAL_METHODS = ["CASH", "BANK_TRANSFER"] as const

/** Pencatatan pembayaran manual oleh staf: tunai atau transfer bank. */
export const manualPaymentInput = z.object({
  bookingCode: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .refine((value) => value.length >= 7 && value.length <= 20, "Kode booking tidak valid"),
  kind: z.enum(PAYMENT_KINDS, "Pilih jenis pembayaran"),
  method: z.enum(MANUAL_METHODS, "Pilih metode pembayaran"),
  amount: rupiah("Jumlah dibayar", { min: 1_000 }),
  refCode: optionalText("Nomor referensi", 60),
  notes: optionalText("Catatan", 300),
})

export type ManualPayment = z.infer<typeof manualPaymentInput>

export const paymentFieldLabels: Record<string, string> = {
  bookingCode: "Kode booking",
  kind: "Jenis pembayaran",
  method: "Metode",
  amount: "Jumlah dibayar",
  refCode: "Nomor referensi",
  notes: "Catatan",
}
