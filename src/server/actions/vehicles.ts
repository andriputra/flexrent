"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { getTenantContext, requireWritable } from "@/lib/tenant"
import { fieldErrorsFromZod, fail, ok, safeAction, type ActionResult } from "@/lib/result"
import { MAX_VEHICLE_PHOTOS, vehicleInput, vehicleFieldLabels } from "@/lib/validators/vehicle"
import { StorageError, deleteImages, uploadImage, type StoredFile } from "@/lib/storage"
import { countVehicles, plateAlreadyUsed } from "@/server/queries/vehicles"

const VEHICLE_FIELDS = [
  "type",
  "plate",
  "brand",
  "model",
  "year",
  "color",
  "transmission",
  "engineCc",
  "seats",
  "fuelType",
  "hasDriver",
  "driverFee",
  "priceDaily",
  "priceWeekly",
  "priceMonthly",
  "deposit",
  "lateFeeDaily",
  "odometer",
  "status",
  "description",
  "isPublished",
] as const

const ACTIVE_BOOKING_STATUSES = ["PENDING", "CONFIRMED", "ONGOING"] as const

function revalidateVehiclePages(slug: string) {
  revalidatePath("/dashboard/vehicles")
  revalidatePath("/dashboard")
  // Halaman publik tenant ikut diperbarui (aktif mulai Fase 3).
  revalidatePath(`/${slug}`)
}

/** FormData hanya mengirim string; field yang hilang dianggap kosong. */
function readVehicleFields(formData: FormData) {
  const record: Record<string, string> = {}
  for (const key of VEHICLE_FIELDS) {
    const value = formData.get(key)
    record[key] = typeof value === "string" ? value : ""
  }
  return record
}

function toVehicleData(value: z.infer<typeof vehicleInput>) {
  return {
    type: value.type,
    plate: value.plate,
    brand: value.brand,
    model: value.model,
    year: value.year,
    color: value.color || null,
    transmission: value.transmission,
    engineCc: value.engineCc,
    seats: value.seats,
    fuelType: value.fuelType,
    hasDriver: value.hasDriver,
    driverFee: value.driverFee ?? 0,
    priceDaily: value.priceDaily,
    priceWeekly: value.priceWeekly,
    priceMonthly: value.priceMonthly,
    deposit: value.deposit ?? 0,
    lateFeeDaily: value.lateFeeDaily,
    odometer: value.odometer,
    status: value.status,
    description: value.description || null,
    isPublished: value.isPublished,
  }
}

async function uploadPhotos(
  slug: string,
  files: File[]
): Promise<StoredFile[]> {
  const stored: StoredFile[] = []
  for (const file of files) {
    stored.push(await uploadImage(file, `vehicles/${slug}`))
  }
  return stored
}

/** Menyisipkan foto baru; foto pertama menjadi utama bila belum ada yang utama. */
async function attachPhotos(vehicleId: string, incoming: StoredFile[]) {
  if (incoming.length === 0) return
  const existing = await prisma.vehiclePhoto.findMany({
    where: { vehicleId },
    orderBy: { sortOrder: "asc" },
    select: { id: true, isPrimary: true },
  })
  const nextOrder = existing.length
  const needPrimary = !existing.some((photo) => photo.isPrimary)

  await prisma.vehiclePhoto.createMany({
    data: incoming.map((item, index) => ({
      vehicleId,
      url: item.url,
      storageKey: item.storageKey,
      sortOrder: nextOrder + index,
      isPrimary: needPrimary && index === 0,
    })),
  })
}

/** Menyusun ulang sortOrder 0..n dan menjamin selalu ada satu foto utama. */
async function normalizePhotos(vehicleId: string) {
  const photos = await prisma.vehiclePhoto.findMany({
    where: { vehicleId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, isPrimary: true },
  })
  if (photos.length === 0) return
  const primaryTaken = photos.some((photo) => photo.isPrimary)

  await prisma.$transaction(
    photos.map((photo, index) =>
      prisma.vehiclePhoto.update({
        where: { id: photo.id },
        data: {
          sortOrder: index,
          isPrimary: primaryTaken ? photo.isPrimary : index === 0,
        },
      })
    )
  )
}

export async function saveVehicleAction(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  return safeAction(async () => {
    const context = await getTenantContext()
    if (!context) {
      return fail("Sesi berakhir. Silakan masuk kembali.", { code: "UNAUTHENTICATED" })
    }
    const blocked = requireWritable(context)
    if (blocked) return fail(blocked, { code: "READ_ONLY" })

    const id = String(formData.get("id") ?? "")
    const parsed = vehicleInput.safeParse(readVehicleFields(formData))
    if (!parsed.success) {
      return fail("Periksa kembali isian kendaraan.", {
        code: "VALIDATION",
        fields: fieldErrorsFromZod(parsed.error, vehicleFieldLabels),
      })
    }

    const duplicate = await plateAlreadyUsed(context.tenant.id, parsed.data.plate, id || undefined)
    if (duplicate) {
      return fail("Plat nomor sudah dipakai kendaraan lain.", {
        code: "CONFLICT",
        fields: { plate: "Plat ini sudah terdaftar di armada Anda" },
      })
    }

    const files = formData
      .getAll("photos")
      .filter((item): item is File => item instanceof File && item.size > 0)

    try {
      if (!id) {
        const limit = context.plan?.maxVehicles ?? 0
        const current = await countVehicles(context.tenant.id)
        if (current >= limit) {
          return fail(
            `Paket ${context.plan?.name ?? "Anda"} hanya mengizinkan ${limit} kendaraan. Upgrade paket untuk menambah armada.`,
            { code: "PLAN_LIMIT" }
          )
        }
        if (files.length > MAX_VEHICLE_PHOTOS) {
          return fail(`Maksimal ${MAX_VEHICLE_PHOTOS} foto per kendaraan.`, { code: "VALIDATION" })
        }

        const incoming = await uploadPhotos(context.tenant.slug, files)
        const vehicle = await prisma.vehicle.create({
          data: { tenantId: context.tenant.id, ...toVehicleData(parsed.data) },
        })
        await attachPhotos(vehicle.id, incoming)
        revalidateVehiclePages(context.tenant.slug)
        return ok({ id: vehicle.id })
      }

      const existing = await prisma.vehicle.findFirst({
        where: { id, tenantId: context.tenant.id },
        select: { id: true, _count: { select: { photos: true } } },
      })
      if (!existing) return fail("Kendaraan tidak ditemukan.", { code: "NOT_FOUND" })
      if (existing._count.photos + files.length > MAX_VEHICLE_PHOTOS) {
        return fail(
          `Total foto maksimal ${MAX_VEHICLE_PHOTOS}. Hapus sebagian foto yang lama dulu.`,
          { code: "VALIDATION", fields: { photos: "Melebihi batas 6 foto" } }
        )
      }

      const incoming = await uploadPhotos(context.tenant.slug, files)
      await prisma.vehicle.update({ where: { id }, data: toVehicleData(parsed.data) })
      await attachPhotos(id, incoming)
      revalidateVehiclePages(context.tenant.slug)
      return ok({ id })
    } catch (error) {
      if (error instanceof StorageError) {
        return fail(error.message, { code: "VALIDATION" })
      }
      throw error
    }
  })
}

export async function setVehicleStatusAction(
  formData: FormData
): Promise<ActionResult<null>> {
  return safeAction(async () => {
    const context = await getTenantContext()
    if (!context) return fail("Sesi berakhir. Silakan masuk kembali.", { code: "UNAUTHENTICATED" })
    const blocked = requireWritable(context)
    if (blocked) return fail(blocked, { code: "READ_ONLY" })

    const id = String(formData.get("id") ?? "")
    const status = z.enum(["AVAILABLE", "RENTED", "MAINTENANCE", "INACTIVE"]).safeParse(
      String(formData.get("status") ?? "")
    )
    if (!id || !status.success) return fail("Status kendaraan tidak valid.", { code: "VALIDATION" })

    const updated = await prisma.vehicle.updateMany({
      where: { id, tenantId: context.tenant.id },
      data: { status: status.data },
    })
    if (updated.count === 0) return fail("Kendaraan tidak ditemukan.", { code: "NOT_FOUND" })

    revalidateVehiclePages(context.tenant.slug)
    return ok(null)
  })
}

/** Tayangkan atau sembunyikan kendaraan dari halaman publik tanpa menghapus datanya. */
export async function setVehiclePublishedAction(
  formData: FormData
): Promise<ActionResult<null>> {
  return safeAction(async () => {
    const context = await getTenantContext()
    if (!context) return fail("Sesi berakhir. Silakan masuk kembali.", { code: "UNAUTHENTICATED" })
    const blocked = requireWritable(context)
    if (blocked) return fail(blocked, { code: "READ_ONLY" })

    const id = String(formData.get("id") ?? "")
    const isPublished = formData.get("isPublished") === "true"
    const updated = await prisma.vehicle.updateMany({
      where: { id, tenantId: context.tenant.id },
      data: { isPublished },
    })
    if (updated.count === 0) return fail("Kendaraan tidak ditemukan.", { code: "NOT_FOUND" })

    revalidateVehiclePages(context.tenant.slug)
    return ok(null)
  })
}

export async function deleteVehicleAction(formData: FormData): Promise<ActionResult<null>> {
  return safeAction(async () => {
    const context = await getTenantContext()
    if (!context) return fail("Sesi berakhir. Silakan masuk kembali.", { code: "UNAUTHENTICATED" })
    if (!context.canManage) {
      return fail("Hanya pemilik atau admin yang dapat menghapus kendaraan.", { code: "FORBIDDEN" })
    }
    const blocked = requireWritable(context)
    if (blocked) return fail(blocked, { code: "READ_ONLY" })

    const id = String(formData.get("id") ?? "")
    const vehicle = await prisma.vehicle.findFirst({
      where: { id, tenantId: context.tenant.id },
      select: {
        id: true,
        plate: true,
        photos: { select: { url: true, storageKey: true } },
      },
    })
    if (!vehicle) return fail("Kendaraan tidak ditemukan.", { code: "NOT_FOUND" })

    const activeBookings = await prisma.booking.count({
      where: { tenantId: context.tenant.id, vehicleId: id, status: { in: [...ACTIVE_BOOKING_STATUSES] } },
    })
    if (activeBookings > 0) {
      return fail(
        `${vehicle.plate} masih punya ${activeBookings} booking aktif. Nonaktifkan kendaraan kalau tidak ingin ditampilkan.`,
        { code: "CONFLICT" }
      )
    }

    await deleteImages(
      vehicle.photos.map((photo) => ({ url: photo.url, storageKey: photo.storageKey ?? photo.url }))
    )
    await prisma.vehicle.delete({ where: { id } })
    revalidateVehiclePages(context.tenant.slug)
    return ok(null)
  })
}

export async function uploadVehiclePhotosAction(
  formData: FormData
): Promise<ActionResult<null>> {
  return safeAction(async () => {
    const context = await getTenantContext()
    if (!context) return fail("Sesi berakhir. Silakan masuk kembali.", { code: "UNAUTHENTICATED" })
    const blocked = requireWritable(context)
    if (blocked) return fail(blocked, { code: "READ_ONLY" })

    const vehicleId = String(formData.get("vehicleId") ?? "")
    const files = formData
      .getAll("photos")
      .filter((item): item is File => item instanceof File && item.size > 0)
    if (!vehicleId || files.length === 0) {
      return fail("Pilih foto yang ingin diunggah.", { code: "VALIDATION" })
    }

    const owned = await prisma.vehicle.findFirst({
      where: { id: vehicleId, tenantId: context.tenant.id },
      select: { id: true, _count: { select: { photos: true } } },
    })
    if (!owned) return fail("Kendaraan tidak ditemukan.", { code: "NOT_FOUND" })
    if (owned._count.photos + files.length > MAX_VEHICLE_PHOTOS) {
      return fail(
        `Total foto maksimal ${MAX_VEHICLE_PHOTOS} (sudah ada ${owned._count.photos}).`,
        { code: "VALIDATION" }
      )
    }

    try {
      const incoming = await uploadPhotos(context.tenant.slug, files)
      await attachPhotos(vehicleId, incoming)
      revalidateVehiclePages(context.tenant.slug)
      return ok(null)
    } catch (error) {
      if (error instanceof StorageError) return fail(error.message, { code: "VALIDATION" })
      throw error
    }
  })
}

/** Mengatur urutan foto dan foto utama. order = daftar id foto hasil seret/klik. */
export async function saveVehiclePhotoLayoutAction(
  formData: FormData
): Promise<ActionResult<null>> {
  return safeAction(async () => {
    const context = await getTenantContext()
    if (!context) return fail("Sesi berakhir. Silakan masuk kembali.", { code: "UNAUTHENTICATED" })
    const blocked = requireWritable(context)
    if (blocked) return fail(blocked, { code: "READ_ONLY" })

    const vehicleId = String(formData.get("vehicleId") ?? "")
    const primaryPhotoId = String(formData.get("primaryPhotoId") ?? "")
    const order = String(formData.get("order") ?? "")
    const photoIds = order.split(",").filter(Boolean)
    if (!vehicleId || photoIds.length === 0) {
      return fail("Susunan foto tidak valid.", { code: "VALIDATION" })
    }

    const owned = await prisma.vehicle.findFirst({
      where: { id: vehicleId, tenantId: context.tenant.id },
      select: { photos: { select: { id: true } } },
    })
    if (!owned) return fail("Kendaraan tidak ditemukan.", { code: "NOT_FOUND" })

    const allowed = new Set(owned.photos.map((photo) => photo.id))
    if (photoIds.some((photoId) => !allowed.has(photoId))) {
      return fail("Ada foto yang bukan milik kendaraan ini.", { code: "FORBIDDEN" })
    }
    if (primaryPhotoId && !allowed.has(primaryPhotoId)) {
      return fail("Foto utama tidak valid.", { code: "FORBIDDEN" })
    }

    await prisma.$transaction(
      photoIds.map((photoId, index) =>
        prisma.vehiclePhoto.update({
          where: { id: photoId },
          data: {
            sortOrder: index,
            isPrimary: primaryPhotoId ? photoId === primaryPhotoId : index === 0,
          },
        })
      )
    )

    revalidateVehiclePages(context.tenant.slug)
    return ok(null)
  })
}

export async function deleteVehiclePhotoAction(formData: FormData): Promise<ActionResult<null>> {
  return safeAction(async () => {
    const context = await getTenantContext()
    if (!context) return fail("Sesi berakhir. Silakan masuk kembali.", { code: "UNAUTHENTICATED" })
    const blocked = requireWritable(context)
    if (blocked) return fail(blocked, { code: "READ_ONLY" })

    const photoId = String(formData.get("photoId") ?? "")
    const photo = await prisma.vehiclePhoto.findFirst({
      where: { id: photoId, vehicle: { tenantId: context.tenant.id } },
      select: { id: true, url: true, storageKey: true, vehicleId: true },
    })
    if (!photo) return fail("Foto tidak ditemukan.", { code: "NOT_FOUND" })

    await deleteImages([{ url: photo.url, storageKey: photo.storageKey ?? photo.url }])
    await prisma.vehiclePhoto.delete({ where: { id: photo.id } })
    await normalizePhotos(photo.vehicleId)

    revalidateVehiclePages(context.tenant.slug)
    return ok(null)
  })
}
