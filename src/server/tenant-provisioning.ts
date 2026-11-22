import { prisma } from "@/lib/db"

/** Masa uji yang diberikan saat tenant baru dibuat, di wizard self-serve maupun form operator. */
export const TRIAL_DAYS = 14

/** Nama slug unik: versi dasar, lalu -2, -3, dst sampai panjang 40. */
export async function uniqueTenantSlug(base: string): Promise<string> {
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
