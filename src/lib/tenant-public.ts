import { cache } from "react"
import { prisma } from "@/lib/db"
import { parseOpeningHours, type OpeningHour } from "@/lib/opening-hours"
import { isSubscriptionBlocked } from "@/lib/tenant"

export type PublicTenant = {
  id: string
  name: string
  slug: string
  city: string
  address: string | null
  phone: string
  email: string | null
  logoUrl: string | null
  tagline: string | null
  terms: string | null
  openingHours: OpeningHour[]
  acceptingBookings: boolean
  closedMessage: string | null
}

/**
 * Tenant untuk halaman publik. Sengaja tidak membaca sesi: pelanggan akhir tidak
 * punya akun, jadi identificationya ya slug di URL.
 */
export const getPublicTenant = cache(async (slug: string): Promise<PublicTenant | null> => {
  const tenant = await prisma.tenant.findFirst({
    where: { slug, isActive: true },
    include: { subscription: true },
  })
  if (!tenant) return null

  const blocked = isSubscriptionBlocked(tenant.subscription)

  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    city: tenant.city,
    address: tenant.address,
    phone: tenant.phone,
    email: tenant.email,
    logoUrl: tenant.logoUrl,
    tagline: tenant.tagline,
    terms: tenant.terms,
    openingHours: parseOpeningHours(tenant.openingHours),
    acceptingBookings: !blocked,
    closedMessage: blocked
      ? "Rental ini sedang tidak menerima pesanan baru. Hubungi WhatsApp untuk info lebih lanjut."
      : null,
  }
})

export function whatsappLink(phone: string, message?: string): string {
  const digits = phone.replace(/\D/g, "").replace(/^0/, "62")
  const base = `https://wa.me/${digits}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}
