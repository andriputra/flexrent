"use server"

import { revalidatePath } from "next/cache"
import type { TestimonialStatus } from "@prisma/client"
import { prisma } from "@/lib/db"
import { fromWib } from "@/lib/datetime"
import { textOf } from "@/lib/form"
import { spamRejection } from "@/lib/anti-abuse"
import { getPublicTenant } from "@/lib/tenant-public"
import { getTenantContext, requireWritable } from "@/lib/tenant"
import { StorageError, deleteImages, uploadImage, type StoredFile } from "@/lib/storage"
import { fieldErrorsFromZod, fail, ok, safeAction, type ActionResult } from "@/lib/result"
import {
  testimonialFieldLabels,
  testimonialInput,
  testimonialPublicInput,
} from "@/lib/validators/testimonial"
import { getTestimonial } from "@/server/queries/testimonials"

const STATUSES = new Set<TestimonialStatus>(["PENDING", "PUBLISHED", "HIDDEN"])

function revalidate(slug: string, vehicleId: string | null) {
  revalidatePath("/dashboard/testimonials")
  revalidatePath(`/${slug}`)
  if (vehicleId) revalidatePath(`/${slug}/kendaraan/${vehicleId}`)
}

/** Kunci berkas avatar lama; Blob menyimpan URL penuh, dev menyimpan path relatif. */
function storedPhoto(photoUrl: string, photoKey: string | null): StoredFile {
  return {
    url: photoUrl,
    storageKey: photoKey ?? (photoUrl.startsWith("/uploads/") ? photoUrl.slice(1) : photoUrl),
  }
}

/**
 * Simpan ulasan yang ditulis staf. Tanggal ulasan diambil tengah hari: nilai itu
 * hanya untuk urutan, dan jam fiktif tidak boleh mendahului ulasan lain di hari
 * yang sama.
 */
export async function saveTestimonialAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  return safeAction(async () => {
    const context = await getTenantContext()
    if (!context) return fail("Sesi berakhir. Silakan masuk kembali.", { code: "UNAUTHENTICATED" })
    const blocked = requireWritable(context)
    if (blocked) return fail(blocked, { code: "READ_ONLY" })

    const id = textOf(formData, "id")
    const parsed = testimonialInput.safeParse({
      id,
      vehicleId: textOf(formData, "vehicleId"),
      author: textOf(formData, "author"),
      rating: textOf(formData, "rating"),
      message: textOf(formData, "message"),
      occurredDay: textOf(formData, "occurredDay"),
      published: formData.get("published") === "1",
    })
    if (!parsed.success) {
      return fail("Periksa kembali isian testimoni.", {
        code: "VALIDATION",
        fields: fieldErrorsFromZod(parsed.error, testimonialFieldLabels),
      })
    }

    const { vehicleId, author, rating, message, occurredDay, published } = parsed.data

    if (vehicleId) {
      const vehicle = await prisma.vehicle.findFirst({
        where: { id: vehicleId, tenantId: context.tenant.id },
        select: { id: true },
      })
      if (!vehicle) {
        return fail("Kendaraan tidak ditemukan.", {
          code: "NOT_FOUND",
          fields: { vehicleId: "Kendaraan ini tidak ada di daftar armada" },
        })
      }
    }

    const existing = id ? await getTestimonial(context.tenant.id, id) : null
    if (id && !existing) return fail("Testimoni tidak ditemukan.", { code: "NOT_FOUND" })

    const file = formData.get("photo")
    let photo: StoredFile | null = null
    if (file instanceof File && file.size > 0) {
      try {
        photo = await uploadImage(file, `testimonials/${context.tenant.slug}`)
      } catch (error) {
        if (error instanceof StorageError) {
          return fail(error.message, { code: "VALIDATION", fields: { photo: error.message } })
        }
        throw error
      }
    }
    const removePhoto = formData.get("removePhoto") === "1"

    /**
     * Sakelar hanya bisa menerbitkan. Matikan sakelar pada ulasan yang masih
     * menunggu tidak boleh mengubahnya jadi "disembunyikan" — untuk itu ada
     * tombol Sembunyikan di baris, supaya antrean moderasi tidak bocor diam-diam.
     */
    const status: TestimonialStatus = published
      ? "PUBLISHED"
      : existing && existing.status !== "PUBLISHED"
        ? existing.status
        : "HIDDEN"

    const fields = {
      vehicleId,
      author,
      rating,
      message,
      occurredAt: fromWib(occurredDay, "12:00"),
      status,
      ...(photo ? { photoUrl: photo.url, photoKey: photo.storageKey } : {}),
      ...(removePhoto ? { photoUrl: null, photoKey: null } : {}),
    }

    const saved = existing
      ? await prisma.testimonial.update({ where: { id: existing.id }, data: fields })
      : await prisma.testimonial.create({
          data: { ...fields, tenantId: context.tenant.id, source: "STAFF" },
        })

    // Avatar lama dibuang setelah baris tersimpan: kalau penyimpanan gagal,
    // ulasan masih punya foto yang lama.
    if ((photo || removePhoto) && existing?.photoUrl) {
      await deleteImages([storedPhoto(existing.photoUrl, existing.photoKey)]).catch(() => undefined)
    }

    revalidate(context.tenant.slug, saved.vehicleId)
    return ok({ id: saved.id })
  })
}

export async function setTestimonialStatusAction(
  formData: FormData
): Promise<ActionResult<null>> {
  return safeAction(async () => {
    const context = await getTenantContext()
    if (!context) return fail("Sesi berakhir. Silakan masuk kembali.", { code: "UNAUTHENTICATED" })
    const blocked = requireWritable(context)
    if (blocked) return fail(blocked, { code: "READ_ONLY" })

    const status = textOf(formData, "status") as TestimonialStatus
    if (!STATUSES.has(status)) return fail("Status testimoni tidak dikenal.", { code: "VALIDATION" })

    const id = textOf(formData, "id")
    const existing = await getTestimonial(context.tenant.id, id)
    if (!existing) return fail("Testimoni tidak ditemukan.", { code: "NOT_FOUND" })

    await prisma.testimonial.update({ where: { id: existing.id }, data: { status } })

    revalidate(context.tenant.slug, existing.vehicleId)
    return ok(null)
  })
}

export async function deleteTestimonialAction(formData: FormData): Promise<ActionResult<null>> {
  return safeAction(async () => {
    const context = await getTenantContext()
    if (!context) return fail("Sesi berakhir. Silakan masuk kembali.", { code: "UNAUTHENTICATED" })
    if (!context.canManage) {
      return fail("Hanya pemilik atau admin yang dapat menghapus testimoni.", { code: "FORBIDDEN" })
    }
    const blocked = requireWritable(context)
    if (blocked) return fail(blocked, { code: "READ_ONLY" })

    const id = textOf(formData, "id")
    const existing = await getTestimonial(context.tenant.id, id)
    if (!existing) return fail("Testimoni tidak ditemukan.", { code: "NOT_FOUND" })

    await prisma.testimonial.delete({ where: { id: existing.id } })
    if (existing.photoUrl) {
      await deleteImages([storedPhoto(existing.photoUrl, existing.photoKey)]).catch(() => undefined)
    }

    revalidate(context.tenant.slug, existing.vehicleId)
    return ok(null)
  })
}

/**
 * Ulasan yang masuk dari halaman publik. Status dan sumber dikunci server:
 * pengirim tidak punya jalur untuk menerbitkan ulasannya sendiri.
 */
export async function submitTestimonialAction(
  formData: FormData
): Promise<ActionResult<{ sent: true }>> {
  return safeAction(async () => {
    const slug = textOf(formData, "slug")
    const tenant = await getPublicTenant(slug)
    if (!tenant) return fail("Rental tidak ditemukan.", { code: "NOT_FOUND" })

    const spam = await spamRejection(formData, { scope: "testimonial", identity: tenant.slug })
    if (spam) return spam

    const parsed = testimonialPublicInput.safeParse({
      vehicleId: textOf(formData, "vehicleId"),
      author: textOf(formData, "author"),
      rating: textOf(formData, "rating"),
      message: textOf(formData, "message"),
    })
    if (!parsed.success) {
      return fail("Periksa kembali ulasan kamu.", {
        code: "VALIDATION",
        fields: fieldErrorsFromZod(parsed.error, testimonialFieldLabels),
      })
    }

    const { vehicleId, author, rating, message } = parsed.data
    if (vehicleId) {
      const vehicle = await prisma.vehicle.findFirst({
        where: { id: vehicleId, tenantId: tenant.id, isPublished: true },
        select: { id: true },
      })
      if (!vehicle) return fail("Kendaraan tidak ditemukan.", { code: "NOT_FOUND" })
    }

    await prisma.testimonial.create({
      data: {
        tenantId: tenant.id,
        vehicleId,
        author,
        rating,
        message,
        occurredAt: new Date(),
        status: "PENDING",
        source: "PUBLIC",
      },
    })

    // Sengaja tidak ada revalidasi: ulasan baru menunggu moderasi, jadi belum
    // ada yang berubah di halaman publik maupun daftar staf sampai staf terbitkan.
    return ok({ sent: true })
  })
}
