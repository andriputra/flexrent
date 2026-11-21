import type { MembershipRole } from "@prisma/client"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { parseOpeningHours, type OpeningHour } from "@/lib/opening-hours"

export type StaffMember = {
  id: string
  role: MembershipRole
  jobTitle: string | null
  name: string | null
  email: string
  /** Email undangan dari profil rental, dipakai saat akun staf belum pernah masuk. */
  invitedEmail: string | null
  isActive: boolean
  /** Belum pernah punya sesi berarti undangan belum diterima. */
  pendingLogin: boolean
  createdAt: Date
}

export type SettingsOverview = {
  tenant: {
    id: string
    name: string
    slug: string
    city: string
    address: string | null
    phone: string
    email: string | null
    tagline: string | null
    logoUrl: string | null
    terms: string | null
  }
  openingHours: OpeningHour[]
  staff: StaffMember[]
  /** Batas staf paket aktif; `null` kalau rental belum punya langganan. */
  staffLimit: number | null
}

/**
 * Semua isian halaman Pengaturan dibaca dari satu fungsi supaya profil, jam buka,
 * syarat sewa, dan daftar staf selalu memakai tenant yang sama dalam satu render.
 */
export async function getSettingsOverview(tenantId: string): Promise<SettingsOverview> {
  const [tenant, staff, plan] = await Promise.all([
    prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        address: true,
        phone: true,
        email: true,
        tagline: true,
        logoUrl: true,
        terms: true,
        openingHours: true,
      },
    }),
    prisma.membership.findMany({
      where: { tenantId },
      include: { user: { select: { name: true, email: true, _count: { select: { sessions: true } } } } },
      orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
    }),
    prisma.subscription.findUnique({
      where: { tenantId },
      select: { plan: { select: { maxStaff: true } } },
    }),
  ])

  const members: StaffMember[] = staff.map((row) => ({
    id: row.id,
    role: row.role,
    jobTitle: row.jobTitle,
    name: row.user.name,
    email: row.user.email,
    invitedEmail: row.invitedEmail,
    isActive: row.isActive,
    pendingLogin: row.user._count.sessions === 0,
    createdAt: row.createdAt,
  }))

  return {
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      city: tenant.city,
      address: tenant.address,
      phone: tenant.phone,
      email: tenant.email,
      tagline: tenant.tagline,
      logoUrl: tenant.logoUrl,
      terms: tenant.terms,
    },
    openingHours: parseOpeningHours(tenant.openingHours as Prisma.JsonValue),
    staff: members,
    staffLimit: plan?.plan.maxStaff ?? null,
  }
}
