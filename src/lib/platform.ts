import { cache } from "react"
import { redirect } from "next/navigation"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export const getPlatformContext = cache(async () => {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return null

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, image: true, isPlatformAdmin: true },
  })
  if (!user?.isPlatformAdmin) return null

  return { user }
})

export async function requirePlatformAdmin() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

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
