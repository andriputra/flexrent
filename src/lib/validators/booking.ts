import { z } from "zod"
import { fromWib, rentalDays, toDayKey } from "@/lib/datetime"
import { normalizePhone } from "@/lib/format"
import { boolField, dayField, optionalText, timeField } from "./common"

/** Nomor WhatsApp Indonesia: 08… (62… dinormalisasi ke 0…). */
const phoneField = z
  .union([z.string(), z.number()])
  .transform((value) => normalizePhone(String(value ?? "")))
  .refine((value) => /^0\d{8,13}$/.test(value), "Nomor WhatsApp tidak valid, contoh 081234567890")

const emailField = z
  .union([z.string(), z.undefined(), z.null()])
  .transform((value) => (value ? String(value).trim().toLowerCase() : ""))
  .refine((value) => value === "" || /^\S+@\S+\.\d+$/.test(value), "Email tidak valid")

export const MAX_RENTAL_DAYS = 180

export const bookingDraftInput = z
  .object({
    vehicleId: z.string().min(1, "Pilih kendaraan dulu"),
    startDay: dayField("Tanggal ambil"),
    startTime: timeField("Jam ambil"),
    returnDay: dayField("Tanggal kembali"),
    returnTime: timeField("Jam kembali"),
    name: z.string().trim().min(2, "Nama lengkap minimal 2 karakter").max(60, "Nama maksimal 60 karakter"),
    phone: phoneField,
    email: emailField,
    idNumber: optionalText("Nomor KTP", 30),
    deliveryMode: z.enum(["SELF_PICKUP", "DELIVERY"], "Pilih cara pengambilan"),
    deliveryArea: optionalText("Area antar", 60),
    deliveryAddress: optionalText("Alamat antar", 200),
    withDriver: boolField,
    notes: optionalText("Catatan", 300),
    agree: boolField,
  })
  .superRefine((value, ctx) => {
    const startsAt = fromWib(value.startDay, value.startTime)
    const endsAt = fromWib(value.returnDay, value.returnTime)

    if (value.startDay < toDayKey(new Date())) {
      ctx.addIssue({ code: "custom", path: ["startDay"], message: "Tanggal ambil tidak boleh sebelum hari ini" })
    }
    if (endsAt.getTime() <= startsAt.getTime()) {
      ctx.addIssue({
        code: "custom",
        path: ["returnDay"],
        message: "Tanggal kembali harus setelah tanggal ambil",
      })
      return
    }
    const days = rentalDays(startsAt, endsAt)
    if (days > MAX_RENTAL_DAYS) {
      ctx.addIssue({
        code: "custom",
        path: ["returnDay"],
        message: `Durasi maksimal ${MAX_RENTAL_DAYS} hari. Hubungi WhatsApp untuk sewa lebih lama.`,
      })
    }
    if (value.deliveryMode === "DELIVERY" && !value.deliveryAddress) {
      ctx.addIssue({
        code: "custom",
        path: ["deliveryAddress"],
        message: "Isi alamat tujuan antar-jemput",
      })
    }
    if (!value.agree) {
      ctx.addIssue({ code: "custom", path: ["agree"], message: "Setujui syarat sewa untuk melanjutkan" })
    }
  })

export type BookingDraft = z.infer<typeof bookingDraftInput>

export const bookingLookupInput = z.object({
  code: z
    .string()
    .transform((value) => value.trim().toUpperCase())
    .refine((value) => value.length >= 7 && value.length <= 20, "Kode booking tidak valid"),
  phone: phoneField,
})

export type BookingLookup = z.infer<typeof bookingLookupInput>

export const bookingFieldLabels: Record<string, string> = {
  vehicleId: "Kendaraan",
  startDay: "Tanggal ambil",
  startTime: "Jam ambil",
  returnDay: "Tanggal kembali",
  returnTime: "Jam kembali",
  name: "Nama lengkap",
  phone: "Nomor WhatsApp",
  email: "Email",
  idNumber: "Nomor KTP",
  deliveryMode: "Cara pengambilan",
  deliveryArea: "Area antar",
  deliveryAddress: "Alamat antar",
  withDriver: "Layanan sopir",
  notes: "Catatan",
  agree: "Syarat sewa",
}
