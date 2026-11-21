import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"

export type MaintenanceFilters = {
  vehicleId?: string
  isDone?: boolean
  page?: number
  perPage?: number
}

const include = {
  vehicle: { select: { id: true, brand: true, model: true, plate: true, type: true } },
} satisfies Prisma.MaintenancePlanInclude

export type MaintenanceRow = Prisma.MaintenancePlanGetPayload<{ include: typeof include }>

export async function listMaintenancePlans(tenantId: string, filters: MaintenanceFilters = {}) {
  const page = Math.max(1, filters.page ?? 1)
  const perPage = Math.min(50, Math.max(5, filters.perPage ?? 12))

  const where = {
    tenantId,
    ...(filters.vehicleId ? { vehicleId: filters.vehicleId } : {}),
    ...(filters.isDone === undefined ? {} : { isDone: filters.isDone }),
  }

  const [rows, total, open] = await prisma.$transaction([
    prisma.maintenancePlan.findMany({
      where,
      include,
      orderBy: [{ isDone: "asc" }, { startsAt: "desc" }],
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.maintenancePlan.count({ where }),
    prisma.maintenancePlan.count({ where: { tenantId, isDone: false } }),
  ])

  return {
    rows: rows as MaintenanceRow[],
    total,
    open,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  }
}

/** Hanya id kendaraan milik tenant yang boleh dijadikan filter. */
export function getVehicleOptions(tenantId: string) {
  return prisma.vehicle.findMany({
    where: { tenantId },
    select: { id: true, brand: true, model: true, plate: true },
    orderBy: [{ type: "asc" }, { brand: "asc" }, { createdAt: "desc" }],
  })
}
