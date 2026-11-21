import type { MetadataRoute } from "next"
import { prisma } from "@/lib/db"
import { isSubscriptionBlocked } from "@/lib/tenant"
import { SITE_URL, absoluteUrl } from "@/lib/seo"

export const revalidate = 3_600

/**
 * Hanya rental yang halaman publiknya masih melayani pesanan yang masuk daftar:
 * tenant nonaktif atau langganan PAST_DUE/CANCELLED sedang ditutup sementara.
 */
async function listableTenants() {
  try {
    const rows = await prisma.tenant.findMany({
      where: { isActive: true },
      include: {
        subscription: true,
        vehicles: {
          where: { isPublished: true, status: { not: "INACTIVE" } },
          select: { id: true, updatedAt: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    })
    return rows.filter((row) => !isSubscriptionBlocked(row.subscription))
  } catch (error) {
    // Sitemap ikut dibangun saat `next build`; DB yang sedang mati tidak boleh
    // membatalkan build hanya karena daftar URL tidak lengkap.
    console.error("[sitemap] daftar rental tidak terbaca", error)
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const marketing: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteUrl("/harga"), changeFrequency: "weekly", priority: 0.6 },
  ]

  const pages: MetadataRoute.Sitemap = (await listableTenants()).flatMap((tenant) => [
    {
      url: absoluteUrl(`/${tenant.slug}`),
      lastModified: tenant.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
    ...tenant.vehicles.map((vehicle) => ({
      url: absoluteUrl(`/${tenant.slug}/kendaraan/${vehicle.id}`),
      lastModified: vehicle.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ])

  if (pages.length === 0) console.warn("[sitemap] tidak ada rental aktif di", SITE_URL)

  return [...marketing, ...pages]
}
