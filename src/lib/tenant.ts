import { cache } from "react"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import type { MembershipRole, Plan, Subscription, Tenant } from "@prisma/client"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export const ACTIVE_TENANT_COOKIE = "flexrent_tenant"

export type TenantContext = {
  user: { id: string; name: string | null; email: string | null; image: string | null }
  tenant: Tenant
  plan: Plan | null
  subscription: Subscription | null
  role: MembershipRole
  memberships: { tenantId: string; tenantName: string; slug: string; role: MembershipRole }[]
  isReadOnly: boolean
  readOnlyReason: string | null
  canManage: boolean
}

/** Status langganan yang berlaku sekarang, termasuk trial yang sudah habis. */
function effectiveStatus(subscription: Subscription | null) {
  if (!subscription) return "NONE" as const
  if (subscription.status === "TRIALING" && subscription.trialEndsAt && subscription.trialEndsAt < new Date()) {
    return "PAST_DUE" as const
  }
  return subscription.status
}

/**
 * Langganan belum bisa dipakai menulis: dashboard jadi read-only dan halaman publik
 * berhenti menerima pesanan. Tanpa langganan (tenant baru daftar) tetap boleh menulis.
 */
export function isSubscriptionBlocked(subscription: Subscription | null): boolean {
  const status = effectiveStatus(subscription)
  return status === "PAST_DUE" || status === "CANCELLED"
}

/**
 * Membaca sesi lalu mengembalikan tenant aktif + role.
 * Tenant dipilih dari cookie pilihan, jatuh ke membership pertama.
 * Nilai tenantId dari klien tidak pernah dipakai.
 */
export const getTenantContext = cache(async (): Promise<TenantContext | null> => {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return null

  const rows = await prisma.membership.findMany({
    where: { userId, isActive: true, tenant: { isActive: true } },
    include: {
      tenant: { include: { subscription: { include: { plan: true } } } },
    },
    orderBy: { createdAt: "asc" },
  })

  if (rows.length === 0) return null

  const preferred = (await cookies()).get(ACTIVE_TENANT_COOKIE)?.value
  const active = rows.find((row) => row.tenantId === preferred) ?? rows[0]
  const status = effectiveStatus(active.tenant.subscription)
  const isReadOnly = status === "PAST_DUE" || status === "CANCELLED"

  return {
    user: {
      id: userId,
      name: session.user?.name ?? null,
      email: session.user?.email ?? active.invitedEmail ?? null,
      image: session.user?.image ?? null,
    },
    tenant: active.tenant,
    plan: active.tenant.subscription?.plan ?? null,
    subscription: active.tenant.subscription,
    role: active.role,
    memberships: rows.map((row) => ({
      tenantId: row.tenant.id,
      tenantName: row.tenant.name,
      slug: row.tenant.slug,
      role: row.role,
    })),
    isReadOnly,
    readOnlyReason: isReadOnly
      ? status === "CANCELLED"
        ? "Langganan sudah dibatalkan. Halaman publik tidak menerima pesanan baru."
        : "Pembayaran langganan belum diselesaikan. Perbarui langganan untuk melanjutkan."
      : null,
    canManage: active.role === "OWNER" || active.role === "ADMIN",
  }
})

/** Untuk halaman: selalu punya tenant, kalau tidak diarahkan ke login/onboarding. */
export async function requireTenant(): Promise<TenantContext> {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const context = await getTenantContext()
  if (!context) redirect("/onboarding")
  return context
}

export function requireWritable(context: TenantContext): string | null {
  return context.isReadOnly
    ? (context.readOnlyReason ??
      "Langganan tidak aktif, dashboard hanya bisa dibaca.")
    : null
}
