import { z } from "zod"
import { FUEL_LEVELS } from "@/lib/handover"
import { optionalIntField, optionalRupiah, optionalText } from "./common"

const MAX_FEE = 100_000_000

const codeField = z
  .string()
  .transform((value) => value.trim().toUpperCase())
  .refine((value) => value.length >= 7 && value.length <= 20, "Kode booking tidak valid")

/** Kolom select yang boleh dikosongkan: "" dari form berarti "tidak dicatat". */
const fuelField = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.enum(FUEL_LEVELS, "Level bahan bakar tidak dikenal").optional()
)

/** Checklist kondisi kendaraan saat serah-terima atau pengembalian. */
export const handoverInput = z.object({
  code: codeField,
  type: z.enum(["PICKUP", "RETURN"], "Jenis serah terima tidak dikenal"),
  odometer: optionalIntField("Odometer", { min: 0, max: 2_000_000 }),
  fuelLevel: fuelField,
  conditionNotes: optionalText("Catatan kondisi", 500),
  damageNotes: optionalText("Catatan kerusakan", 500),
})

export const handoverFieldLabels: Record<string, string> = {
  code: "Kode booking",
  type: "Jenis",
  odometer: "Odometer",
  fuelLevel: "Level bahan bakar",
  conditionNotes: "Catatan kondisi",
  damageNotes: "Catatan kerusakan",
}

const FEE_LABELS: Record<string, string> = {
  lateFee: "Denda keterlambatan",
  damageFee: "Biaya kerusakan",
  depositRefund: "Deposit dikembalikan",
}

/** Penghitungan akhir sewa: denda, kerusakan, dan deposit yang dikembalikan. */
export const closingInput = z
  .object({
    code: codeField,
    lateFee: optionalRupiah("Denda keterlambatan"),
    damageFee: optionalRupiah("Biaya kerusakan"),
    depositRefund: optionalRupiah("Deposit dikembalikan"),
    method: z.enum(["CASH", "BANK_TRANSFER"], "Pilih cara pengembalian deposit"),
    notes: optionalText("Catatan pengembalian", 300),
  })
  .superRefine((value, ctx) => {
    for (const key of ["lateFee", "damageFee", "depositRefund"] as const) {
      const amount = value[key]
      if (amount !== null && amount > MAX_FEE) {
        ctx.addIssue({ code: "custom", path: [key], message: `${FEE_LABELS[key]} terlalu besar` })
      }
    }
  })

export const closingFieldLabels: Record<string, string> = {
  code: "Kode booking",
  lateDays: "Hari keterlambatan",
  ...FEE_LABELS,
  method: "Cara pengembalian",
  notes: "Catatan",
}
