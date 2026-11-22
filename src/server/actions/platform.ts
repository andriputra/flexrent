"use server"

import { revalidatePath } from "next/cache"
import { prisma, TX_OPTIONS } from "@/lib/db"
import { createAuditLog, requirePlatformAdmin } from "@/lib/platform"
import { fail, fieldErrorsFromZod, ok, safeAction, type ActionResult } from "@/lib/result"
import { slugify } from "@/lib/slug"
import { generateHandoverPassword, hashPassword } from "@/lib/password"
import { TRIAL_DAYS, uniqueTenantSlug } from "@/server/tenant-provisioning"
import { platformTenantFieldLabels, platformTenantInput } from "@/lib/validators/platform"

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

export type PlatformNewTenant = {
  tenantId: string
  tenantName: string
  slug: string
  planName: string
  ownerName: string
  ownerEmail: string
  /** Hanya benar bila akun pemilik baru dibuat; kalau tidak, sandi lamanya tetap berlaku. */
  accountCreated: boolean
  initialPassword: string | null
  trialEndsAt: string | null
}

/**
 * Operator mendaftarkan rental atas nama klien: tenant + keanggotaan OWNER untuk
 * email klien + langganan, dalam satu transaksi supaya tidak ada rental yatim.
 */
export async function createTenantByPlatformAction(formData: FormData): Promise<ActionResult<PlatformNewTenant>> {
  return safeAction(async () => {
    const context = await requirePlatformAdmin()

    const parsed = platformTenantInput.safeParse({
      name: text(formData, "name"),
      slugInput: text(formData, "slugInput"),
      city: text(formData, "city"),
      phone: text(formData, "phone"),
      address: text(formData, "address"),
      email: text(formData, "email"),
      ownerName: text(formData, "ownerName"),
      ownerEmail: text(formData, "ownerEmail"),
      planCode: text(formData, "planCode"),
      withTrial: text(formData, "withTrial"),
    })
    if (!parsed.success) {
      return fail("Periksa kembali isian formulir.", {
        code: "VALIDATION",
        fields: fieldErrorsFromZod(parsed.error, platformTenantFieldLabels),
      })
    }
    const { name, slugInput, city, phone, address, email, ownerName, ownerEmail, planCode, withTrial } = parsed.data

    const plan = await prisma.plan.findUnique({ where: { code: planCode }, select: { id: true, name: true } })
    if (!plan) return fail(`Paket ${planCode} belum terdaftar di sistem.`, { code: "NOT_FOUND" })

    const slug = await uniqueTenantSlug(slugify(slugInput || name))

    const existing = await prisma.user.findUnique({ where: { email: ownerEmail }, select: { id: true } })
    let ownerId: string
    let initialPassword: string | null = null
    if (existing) {
      ownerId = existing.id
    } else {
      initialPassword = generateHandoverPassword()
      const created = await prisma.user.create({
        // emailVerified sengaja kosong seperti pendaftaran mandiri: belum ada bukti
        // kepemilikan mailbox selama SMTP mati.
        data: { email: ownerEmail, name: ownerName, passwordHash: await hashPassword(initialPassword) },
        select: { id: true },
      })
      ownerId = created.id
    }

    const now = new Date()
    const periodEnd = withTrial
      ? new Date(now.getTime() + TRIAL_DAYS * 86_400_000)
      : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())

    const tenant = await prisma.$transaction(
      async (tx) => {
        const created = await tx.tenant.create({
          data: {
            name,
            slug,
            city,
            phone,
            address: address || null,
            email: email || null,
            memberships: { create: { userId: ownerId, role: "OWNER", isActive: true } },
          },
          select: { id: true, name: true, slug: true },
        })

        await tx.subscription.create({
          data: {
            tenantId: created.id,
            planId: plan.id,
            status: withTrial ? "TRIALING" : "ACTIVE",
            trialEndsAt: withTrial ? periodEnd : null,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
          },
        })

        await tx.auditLog.create({
          data: {
            actorId: context.user.id,
            tenantId: created.id,
            action: "TENANT_CREATED",
            entityType: "Tenant",
            entityId: created.id,
            metadata: { slug: created.slug, planCode, ownerEmail, accountCreated: !existing },
          },
        })

        return created
      },
      TX_OPTIONS
    )

    revalidatePath("/admin")
    revalidatePath("/admin/tenants")
    revalidatePath(`/${tenant.slug}`, "layout")

    return ok({
      tenantId: tenant.id,
      tenantName: tenant.name,
      slug: tenant.slug,
      planName: plan.name,
      ownerName,
      ownerEmail,
      accountCreated: !existing,
      initialPassword,
      trialEndsAt: withTrial ? periodEnd.toISOString() : null,
    })
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
