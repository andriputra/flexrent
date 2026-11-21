import { z } from "zod"
import { dayField, optionalText, timeField } from "./common"

export const maintenanceInput = z
  .object({
    vehicleId: z.string().min(1, "Pilih kendaraan"),
    title: z.string().trim().min(3, "Judul minimal 3 karakter").max(80, "Judul maksimal 80 karakter"),
    startDay: dayField("Tanggal mulai"),
    startTime: timeField("Jam mulai"),
    endDay: dayField("Tanggal selesai"),
    endTime: timeField("Jam selesai"),
    notes: optionalText("Catatan", 300),
  })
  .superRefine((value, ctx) => {
    const start = `${value.startDay}T${value.startTime}`
    const end = `${value.endDay}T${value.endTime}`
    if (end <= start) {
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "Selesai harus setelah mulai",
      })
    }
    const spanDays = Math.round(
      (Date.parse(`${value.endDay}T00:00:00Z`) - Date.parse(`${value.startDay}T00:00:00Z`)) /
        86_400_000
    )
    if (spanDays > 30) {
      ctx.addIssue({
        code: "custom",
        path: ["endDay"],
        message: "Jadwal perawatan maksimal 30 hari",
      })
    }
  })

export type MaintenanceInput = z.infer<typeof maintenanceInput>

export const maintenanceFieldLabels: Record<string, string> = {
  vehicleId: "Kendaraan",
  title: "Judul",
  startDay: "Tanggal mulai",
  startTime: "Jam mulai",
  endDay: "Tanggal selesai",
  endTime: "Jam selesai",
  notes: "Catatan",
}
