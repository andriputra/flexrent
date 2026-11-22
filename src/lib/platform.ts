import { cache } from "react"
import { redirect } from "next/navigation"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

/** Sesi dibaca sekali per permintaan: layout dan halaman memakai pengguna yang sama. */
const getSessionUser = cache(async () => {
  const session = await auth()
  return session?.user?.id ? session.user : null
})

export const getPlatformContext = cache(async () => {
  const user = await getSessionUser()
  if (!user) return null

  const actor = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, name: true, email: true, image: true, isPlatformAdmin: true },
  })
  if (!actor?.isPlatformAdmin) return null

  return { user: actor }
})

export async function requirePlatformAdmin() {
  if (!(await getSessionUser())) redirect("/login")

  const context = await getPlatformContext()
  if (!context) redirect("/dashboard")
  return context
}

export async function createAuditLog(input: {
  actorId: string
  tenantId?: string | null
  action: string
  entityType: string
  entityId?: string | null
  metadata?: Record<string, unknown>
}) {
  return prisma.auditLog.create({
    data: {
      actorId: input.actorId,
      tenantId: input.tenantId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      ...(input.metadata ? { metadata: input.metadata as Prisma.InputJsonObject } : {}),
    },
  })
}
