"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { fromWib } from "@/lib/datetime"
import { getTenantContext, requireWritable } from "@/lib/tenant"
import { fieldErrorsFromZod, fail, ok, safeAction, type ActionResult } from "@/lib/result"
import { maintenanceInput, maintenanceFieldLabels } from "@/lib/validators/maintenance"
import { findConflictingBookings, findConflictingMaintenance } from "@/server/queries/vehicles"

function revalidate(slug: string) {
  revalidatePath("/dashboard/vehicles")
  revalidatePath("/dashboard/maintenance")
  revalidatePath(`/${slug}`)
}

export async function saveMaintenanceAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  return safeAction(async () => {
    const context = await getTenantContext()
    if (!context) return fail("Sesi berakhir. Silakan masuk kembali.", { code: "UNAUTHENTICATED" })
    const blocked = requireWritable(context)
    if (blocked) return fail(blocked, { code: "READ_ONLY" })

    const record = Object.fromEntries(
      ["vehicleId", "title", "startDay", "startTime", "endDay", "endTime", "notes"].map((key) => {
        const value = formData.get(key)
        return [key, typeof value === "string" ? value : ""]
      })
    )

    const parsed = maintenanceInput.safeParse(record)
    if (!parsed.success) {
      return fail("Periksa kembali jadwal perawatan.", {
        code: "VALIDATION",
        fields: fieldErrorsFromZod(parsed.error, maintenanceFieldLabels),
      })
    }

    const { vehicleId, title, startDay, startTime, endDay, endTime, notes } = parsed.data
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, tenantId: context.tenant.id },
      select: { id: true, plate: true },
    })
    if (!vehicle) return fail("Kendaraan tidak ditemukan.", { code: "NOT_FOUND" })

    const startsAt = fromWib(startDay, startTime)
    const endsAt = fromWib(endDay, endTime)

    const bookingConflict = await findConflictingBookings(vehicleId, startsAt, endsAt)
    if (bookingConflict) {
      return fail(
        `${vehicle.plate} sedang dipesan pada rentang itu (booking ${bookingConflict.code}). Jadwal perawatan ditolak.`,
        { code: "CONFLICT" }
      )
    }

    const maintenanceConflict = await findConflictingMaintenance(vehicleId, startsAt, endsAt)
    if (maintenanceConflict) {
      return fail("Sudah ada jadwal perawatan yang tumpang tindih pada tanggal tersebut.", {
        code: "CONFLICT",
        fields: { startDay: "Bentrok dengan jadwal lain" },
      })
    }

    const created = await prisma.maintenancePlan.create({
      data: {
        tenantId: context.tenant.id,
        vehicleId,
        title,
        startsAt,
        endsAt,
        notes: notes || null,
      },
    })

    revalidate(context.tenant.slug)
    return ok({ id: created.id })
  })
}

export async function completeMaintenanceAction(formData: FormData): Promise<ActionResult<null>> {
  return safeAction(async () => {
    const context = await getTenantContext()
    if (!context) return fail("Sesi berakhir. Silakan masuk kembali.", { code: "UNAUTHENTICATED" })
    const blocked = requireWritable(context)
    if (blocked) return fail(blocked, { code: "READ_ONLY" })

    const id = String(formData.get("id") ?? "")
    const updated = await prisma.maintenancePlan.updateMany({
      where: { id, tenantId: context.tenant.id },
      data: { isDone: true },
    })
    if (updated.count === 0) return fail("Jadwal perawatan tidak ditemukan.", { code: "NOT_FOUND" })

    revalidate(context.tenant.slug)
    return ok(null)
  })
}

export async function deleteMaintenanceAction(formData: FormData): Promise<ActionResult<null>> {
  return safeAction(async () => {
    const context = await getTenantContext()
    if (!context) return fail("Sesi berakhir. Silakan masuk kembali.", { code: "UNAUTHENTICATED" })
    if (!context.canManage) {
      return fail("Hanya pemilik atau admin yang dapat menghapus jadwal perawatan.", { code: "FORBIDDEN" })
    }
    const blocked = requireWritable(context)
    if (blocked) return fail(blocked, { code: "READ_ONLY" })

    const id = String(formData.get("id") ?? "")
    const deleted = await prisma.maintenancePlan.deleteMany({
      where: { id, tenantId: context.tenant.id },
    })
    if (deleted.count === 0) return fail("Jadwal perawatan tidak ditemukan.", { code: "NOT_FOUND" })

    revalidate(context.tenant.slug)
    return ok(null)
  })
}
