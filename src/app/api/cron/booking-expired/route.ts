import { revalidatePath } from "next/cache"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { isCronAuthorized, unauthorizedCron } from "@/lib/cron"

export const runtime = "nodejs"

/** Booking PENDING yang lewat batas waktu (2 jam) ditutup otomatis. */
export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) return unauthorizedCron()

  const due = await prisma.booking.findMany({
    where: { status: "PENDING", expiresAt: { lt: new Date() } },
    select: { id: true, code: true, tenant: { select: { slug: true } } },
    take: 500,
  })

  if (!due.length) return Response.json({ ok: true, expired: 0 })

  await prisma.booking.updateMany({ where: { id: { in: due.map((item) => item.id) } }, data: { status: "EXPIRED" } })

  // Satu revalidasi per slug lebih murah daripada per kode.
  for (const slug of new Set(due.map((item) => item.tenant.slug))) revalidatePath(`/${slug}`, "layout")

  return Response.json({ ok: true, expired: due.length, codes: due.map((item) => item.code) })
}
