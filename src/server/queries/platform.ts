import type { SubscriptionStatus } from "@prisma/client"
import { prisma } from "@/lib/db"

const ACTIVE_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = ["TRIALING", "ACTIVE"]

export async function getPlatformOverview() {
  const [tenantTotal, activeTenantTotal, userTotal, vehicleTotal, bookingTotal, subscriptionRows, recentTenants, recentAuditLogs] =
    await Promise.all([
      prisma.tenant.count(),
      prisma.tenant.count({ where: { isActive: true } }),
      prisma.user.count(),
      prisma.vehicle.count(),
      prisma.booking.count(),
      prisma.subscription.findMany({
        where: { status: { in: ACTIVE_SUBSCRIPTION_STATUSES } },
        include: { plan: { select: { priceMonthly: true } } },
      }),
      prisma.tenant.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          name: true,
          slug: true,
          city: true,
          isActive: true,
          createdAt: true,
          subscription: { select: { status: true, plan: { select: { name: true, code: true } } } },
          _count: { select: { memberships: true, vehicles: true, bookings: true } },
        },
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          actor: { select: { name: true, email: true } },
          tenant: { select: { name: true } },
        },
      }),
    ])

  return {
    tenantTotal,
    activeTenantTotal,
    userTotal,
    vehicleTotal,
    bookingTotal,
    recurringRevenue: subscriptionRows.reduce((sum, row) => sum + row.plan.priceMonthly, 0),
    recentTenants,
    recentAuditLogs,
  }
}

export async function listPlatformTenants(search?: string) {
  const value = search?.trim()
  return prisma.tenant.findMany({
    where: value
      ? {
          OR: [
            { name: { contains: value, mode: "insensitive" } },
            { slug: { contains: value, mode: "insensitive" } },
            { city: { contains: value, mode: "insensitive" } },
            { email: { contains: value, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      city: true,
      email: true,
      phone: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      subscription: {
        select: {
          status: true,
          currentPeriodEnd: true,
          plan: { select: { name: true, code: true, priceMonthly: true } },
        },
      },
      _count: { select: { memberships: true, vehicles: true, bookings: true, invoices: true } },
    },
  })
}

export async function getPlatformTenant(tenantId: string) {
  return prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      subscription: { include: { plan: true } },
      memberships: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { name: true, email: true } } },
      },
      invoices: { orderBy: { createdAt: "desc" }, take: 8 },
      _count: { select: { vehicles: true, customers: true, bookings: true, payments: true } },
    },
  })
}

export async function listPlatformUsers(search?: string) {
  const value = search?.trim()
  return prisma.user.findMany({
    where: value
      ? {
          OR: [
            { name: { contains: value, mode: "insensitive" } },
            { email: { contains: value, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      isPlatformAdmin: true,
      createdAt: true,
      memberships: {
        where: { isActive: true },
        select: { role: true, tenant: { select: { id: true, name: true, slug: true, isActive: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  })
}

export async function listPlatformPlans() {
  return prisma.plan.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { subscriptions: true } } },
  })
}

export async function listPlatformAuditLogs() {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      actor: { select: { name: true, email: true } },
      tenant: { select: { name: true } },
    },
  })
}
