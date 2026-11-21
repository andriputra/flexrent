import { z } from "zod"
import {
  boolField,
  intField,
  optionalIntField,
  optionalRupiah,
  optionalText,
  rupiah,
} from "./common"

const VEHICLE_TYPES = ["MOTOR", "MOBIL"] as const
const VEHICLE_STATUSES = ["AVAILABLE", "RENTED", "MAINTENANCE", "INACTIVE"] as const
const TRANSMISSIONS = ["MANUAL", "MATIC"] as const
const FUEL_TYPES = ["PETROL", "DIESEL", "HYBRID", "ELECTRIC"] as const

const currentYear = new Date().getFullYear()

/** Batas foto per kendaraan, dipakai form dan server action. */
export const MAX_VEHICLE_PHOTOS = 6

export const vehicleInput = z
  .object({
    type: z.enum(VEHICLE_TYPES, "Pilih jenis kendaraan"),
    plate: z
      .string()
      .transform((value) => value.toUpperCase().replace(/\s+/g, " ").trim())
      .refine((value) => value.length >= 6, "Plat nomor minimal 6 karakter")
      .refine((value) => value.length <= 14, "Plat nomor maksimal 14 karakter"),
    brand: z.string().trim().min(2, "Merek wajib diisi").max(40, "Merek maksimal 40 karakter"),
    model: z.string().trim().min(1, "Model wajib diisi").max(60, "Model maksimal 60 karakter"),
    year: intField("Tahun", { min: 1980, max: currentYear + 1 }),
    color: optionalText("Warna", 20),
    transmission: z.enum(TRANSMISSIONS, "Pilih transmisi"),
    engineCc: optionalIntField("Isi silinder (CC)", { min: 50, max: 6000 }),
    seats: optionalIntField("Jumlah kursi", { min: 2, max: 20 }),
    fuelType: z.enum(FUEL_TYPES, "Pilih jenis bahan bakar"),
    hasDriver: boolField,
    driverFee: optionalRupiah("Tarif sopir"),
    priceDaily: rupiah("Tarif harian", { min: 10_000 }),
    priceWeekly: optionalRupiah("Tarif mingguan"),
    priceMonthly: optionalRupiah("Tarif bulanan"),
    deposit: optionalRupiah("Deposit"),
    lateFeeDaily: optionalRupiah("Denda keterlambatan per hari"),
    odometer: optionalIntField("Odometer", { min: 0, max: 2_000_000 }),
    status: z.enum(VEHICLE_STATUSES, "Pilih status kendaraan"),
    description: optionalText("Deskripsi", 1000),
    isPublished: boolField,
  })
  .superRefine((value, ctx) => {
    if (value.type === "MOTOR") {
      if (value.engineCc === null) {
        ctx.addIssue({ code: "custom", path: ["engineCc"], message: "Isi silinder (CC) wajib untuk motor" })
      }
      if (value.seats !== null) {
        ctx.addIssue({ code: "custom", path: ["seats"], message: "Jumlah kursi hanya untuk mobil" })
      }
      if (value.hasDriver) {
        ctx.addIssue({ code: "custom", path: ["hasDriver"], message: "Opsi sopir hanya untuk mobil" })
      }
    } else {
      if (value.seats === null) {
        ctx.addIssue({ code: "custom", path: ["seats"], message: "Jumlah kursi wajib untuk mobil" })
      }
      if (value.hasDriver && (value.driverFee === null || value.driverFee <= 0)) {
        ctx.addIssue({ code: "custom", path: ["driverFee"], message: "Isi tarif sopir bila layanan sopir aktif" })
      }
    }
    if (value.priceWeekly !== null && value.priceWeekly > value.priceDaily * 7) {
      ctx.addIssue({ code: "custom", path: ["priceWeekly"], message: "Tarif mingguan sebaiknya tidak lebih tinggi dari 7 hari" })
    }
    if (value.priceMonthly !== null && value.priceMonthly > value.priceDaily * 30) {
      ctx.addIssue({ code: "custom", path: ["priceMonthly"], message: "Tarif bulanan sebaiknya tidak lebih tinggi dari 30 hari" })
    }
  })

export type VehicleInput = z.infer<typeof vehicleInput>

export const vehicleFieldLabels: Record<string, string> = {
  type: "Jenis kendaraan",
  plate: "Plat nomor",
  brand: "Merek",
  model: "Model",
  year: "Tahun",
  color: "Warna",
  transmission: "Transmisi",
  engineCc: "Isi silinder (CC)",
  seats: "Jumlah kursi",
  fuelType: "Bahan bakar",
  hasDriver: "Layanan sopir",
  driverFee: "Tarif sopir",
  priceDaily: "Tarif harian",
  priceWeekly: "Tarif mingguan",
  priceMonthly: "Tarif bulanan",
  deposit: "Deposit",
  lateFeeDaily: "Denda keterlambatan per hari",
  odometer: "Odometer",
  status: "Status",
  description: "Deskripsi",
  isPublished: "Tayang di halaman publik",
}

/** Perubahan urutan/label foto dikirim sebagai daftar key URL. */
export const photoOrderInput = z.object({
  vehicleId: z.string().min(1),
  photos: z
    .array(
      z.object({
        url: z.string().min(1),
        storageKey: z.string().optional(),
        alt: z.string().max(120).optional(),
        isPrimary: z.boolean().optional(),
      })
    )
    .max(6, "Maksimal 6 foto per kendaraan"),
})

export { VEHICLE_STATUSES, VEHICLE_TYPES }
