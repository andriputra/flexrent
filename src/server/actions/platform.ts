"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { createAuditLog, requirePlatformAdmin } from "@/lib/platform"
import { fail, ok, safeAction, type ActionResult } from "@/lib/result"

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim()
}

function nonNegativeInteger(value: string): number | null {
  if (!/^\d+$/.test(value)) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null
}

export async function setPlatformTenantActiveAction(formData: FormData): Promise<ActionResult<null>> {
  return safeAction(async () => {
    const context = await requirePlatformAdmin()
    const tenantId = text(formData, "tenantId")
    const active = text(formData, "active") === "true"
    if (!tenantId) return fail("Tenant tidak valid.", { code: "VALIDATION" })

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true, name: true, slug: true, isActive: true } })
    if (!tenant) return fail("Tenant tidak ditemukan.", { code: "NOT_FOUND" })
    if (tenant.isActive === active) return ok(null)

    await prisma.$transaction(async (tx) => {
      await tx.tenant.update({ where: { id: tenant.id }, data: { isActive: active } })
      await tx.auditLog.create({
        data: {
          actorId: context.user.id,
          tenantId: tenant.id,
          action: active ? "TENANT_REACTIVATED" : "TENANT_SUSPENDED",
          entityType: "Tenant",
          entityId: tenant.id,
          metadata: { previousActive: tenant.isActive, nextActive: active },
        },
      })
    })

    revalidatePath("/admin")
    revalidatePath("/admin/tenants")
    // "layout": seluruh situs tenant ikut diperbarui, bukan hanya halaman utamanya,
    // supaya halaman kendaraan & wizard yang masih tercache ikut 404 saat disuspend.
    revalidatePath(`/${tenant.slug}`, "layout")
    return ok(null)
  })
}

export async function updatePlatformPlanAction(formData: FormData): Promise<ActionResult<null>> {
  return safeAction(async () => {
    const context = await requirePlatformAdmin()
    const planId = text(formData, "planId")
    const priceMonthly = nonNegativeInteger(text(formData, "priceMonthly"))
    const priceYearlyRaw = text(formData, "priceYearly")
    const priceYearly = priceYearlyRaw ? nonNegativeInteger(priceYearlyRaw) : null
    const maxVehicles = nonNegativeInteger(text(formData, "maxVehicles"))
    const maxStaff = nonNegativeInteger(text(formData, "maxStaff"))
    const isPublic = text(formData, "isPublic") === "true"

    if (!planId || priceMonthly === null || (priceYearlyRaw && priceYearly === null) || maxVehicles === null || maxStaff === null) {
      return fail("Nilai paket harus berupa angka nol atau lebih.", { code: "VALIDATION" })
    }

    const plan = await prisma.plan.findUnique({ where: { id: planId }, select: { id: true, name: true } })
    if (!plan) return fail("Paket tidak ditemukan.", { code: "NOT_FOUND" })

    await prisma.$transaction(async (tx) => {
      await tx.plan.update({
        where: { id: plan.id },
        data: { priceMonthly, priceYearly, maxVehicles, maxStaff, isPublic },
      })
      await tx.auditLog.create({
        data: {
          actorId: context.user.id,
          action: "PLAN_UPDATED",
          entityType: "Plan",
          entityId: plan.id,
          metadata: { name: plan.name, priceMonthly, priceYearly, maxVehicles, maxStaff, isPublic },
        },
      })
    })

    revalidatePath("/admin")
    revalidatePath("/admin/plans")
    revalidatePath("/dashboard/billing")
    return ok(null)
  })
}

export async function recordPlatformAuditAction(input: {
  action: string
  entityType: string
  entityId?: string
  tenantId?: string
  metadata?: Record<string, unknown>
}) {
  const context = await requirePlatformAdmin()
  return createAuditLog({ ...input, actorId: context.user.id })
}
