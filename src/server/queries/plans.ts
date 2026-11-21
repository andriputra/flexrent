import { prisma } from "@/lib/db"
import type { PlanCode } from "@prisma/client"

export function getPublicPlans() {
  return prisma.plan.findMany({
    where: { isPublic: true },
    orderBy: { sortOrder: "asc" },
  })
}

export function getPlanByCode(code: PlanCode) {
  return prisma.plan.findUnique({ where: { code } })
}
