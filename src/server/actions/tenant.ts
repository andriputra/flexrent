"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { prisma, TX_OPTIONS } from "@/lib/db"
import { auth } from "@/lib/auth"
import { ACTIVE_TENANT_COOKIE } from "@/lib/tenant"
import { slugify } from "@/lib/slug"
import { fieldErrorsFromZod, fail, ok, type ActionResult } from "@/lib/result"
import { tenantOnboardingInput, tenantFieldLabels } from "@/lib/validators/tenant"

const TRIAL_DAYS = 14

/** Nama slug unik: versi dasar, lalu -2, -3, dst sampai panjang 40. */
async function uniqueSlug(base: string): Promise<string> {
  if (base.length === 0) return ""
  let candidate = base
  let suffix = 1
  while (suffix < 50) {
    const taken = await prisma.tenant.findUnique({ where: { slug: candidate }, select: { id: true } })
    if (!taken) return candidate
    suffix += 1
    candidate = `${base}-${suffix}`.slice(0, 40)
  }
  return `${base}-${Date.now()}`.slice(0, 40)
}

export async function createTenantAction(
  values: Record<string, string>
): Promise<ActionResult<{ slug: string }>> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    return fail("Sesi berakhir. Silakan masuk kembali.", { code: "UNAUTHENTICATED" })
  }

  const parsed = tenantOnboardingInput.safeParse(values)
  if (!parsed.success) {
    return fail("Periksa kembali isian formulir.", { code: "VALIDATION", fields: fieldErrorsFromZod(parsed.error, tenantFieldLabels) })
  }

  const existing = await prisma.membership.findFirst({
    where: { userId, isActive: true },
    select: { id: true },
  })
  if (existing) {
    return fail("Akun ini sudah terhubung ke sebuah rental.", { code: "CONFLICT" })
  }

  // Schema sudah menjamin slug valid dan tidakreserved (lihat tenantOnboardingInput).
  const { name, slugInput, city, phone, address, email } = parsed.data
  const slug = await uniqueSlug(slugify(slugInput || name))

  const starter = await prisma.plan.findUnique({ where: { code: "STARTER" } })
  if (!starter) return fail("Paket Starter belum tersedia. Hubungi dukungan Flexrent.")

  const now = new Date()
  const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * 86_400_000)

  const tenant = await prisma.$transaction(async (tx) => {
    const created = await tx.tenant.create({
      data: {
        name,
        slug,
        city,
        phone,
        address: address || null,
        email: email || null,
        memberships: {
          create: { userId, role: "OWNER", isActive: true },
        },
      },
    })

    await tx.subscription.create({
      data: {
        tenantId: created.id,
        planId: starter.id,
        status: "TRIALING",
        trialEndsAt,
        currentPeriodStart: now,
        currentPeriodEnd: trialEndsAt,
      },
    })

    return created
  }, TX_OPTIONS)

  const store = await cookies()
  store.set(ACTIVE_TENANT_COOKIE, tenant.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  })

  revalidatePath("/dashboard")
  revalidatePath("/onboarding")

  return ok({ slug: tenant.slug })
}

export async function setActiveTenantAction(tenantId: string): Promise<ActionResult<null>> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return fail("Sesi berakhir. Silakan masuk kembali.", { code: "UNAUTHENTICATED" })

  const membership = await prisma.membership.findFirst({
    where: { userId, tenantId, isActive: true },
    select: { tenantId: true },
  })
  if (!membership) return fail("Anda bukan anggota rental tersebut.")

  const store = await cookies()
  store.set(ACTIVE_TENANT_COOKIE, tenantId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  })

  revalidatePath("/dashboard", "layout")
  return ok(null)
}
