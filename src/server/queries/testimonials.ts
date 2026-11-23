import type { Prisma, TestimonialStatus } from "@prisma/client"
import { prisma } from "@/lib/db"

export type TestimonialFilters = {
  status?: TestimonialStatus | "ALL"
  vehicleId?: string
  page?: number
  perPage?: number
}

const include = {
  vehicle: { select: { id: true, brand: true, model: true, plate: true, type: true } },
} satisfies Prisma.TestimonialInclude

export type TestimonialRow = Prisma.TestimonialGetPayload<{ include: typeof include }>

/**
 * Daftar untuk staf. Antrean moderasi (status PENDING) ikut muncul di filter
 * "Semua" karena pengulas butuh dilihat tanpa berpindah status lebih dulu.
 */
export async function listTestimonials(tenantId: string, filters: TestimonialFilters = {}) {
  const page = Math.max(1, filters.page ?? 1)
  const perPage = Math.min(50, Math.max(5, filters.perPage ?? 12))

  const where = {
    tenantId,
    ...(filters.status && filters.status !== "ALL" ? { status: filters.status } : {}),
    ...(filters.vehicleId ? { vehicleId: filters.vehicleId } : {}),
  }

  const [rows, total, pending] = await prisma.$transaction([
    prisma.testimonial.findMany({
      where,
      include,
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.testimonial.count({ where }),
    prisma.testimonial.count({ where: { tenantId, status: "PENDING" } }),
  ])

  return {
    rows: rows as TestimonialRow[],
    total,
    pending,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  }
}

/** Satu baris milik tenant ini saja — dipakai aksi sebelum mengubah/menghapus. */
export function getTestimonial(tenantId: string, id: string) {
  return prisma.testimonial.findFirst({ where: { id, tenantId }, include })
}
