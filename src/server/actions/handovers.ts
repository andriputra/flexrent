"use server"

import { revalidatePath } from "next/cache"
import type { HandoverPhotoPosition, HandoverType } from "@prisma/client"
import { prisma, TX_OPTIONS } from "@/lib/db"
import { textOf } from "@/lib/form"
import { MAX_HANDOVER_PHOTOS, PHOTO_POSITIONS } from "@/lib/handover"
import { StorageError, deleteImages, uploadImage, type StoredFile } from "@/lib/storage"
import { fieldErrorsFromZod, fail, ok, safeAction, type ActionResult } from "@/lib/result"
import { requireTenant, requireWritable } from "@/lib/tenant"
import { handoverFieldLabels, handoverInput } from "@/lib/validators/handover"

/** Posisi yang bisa difoto: lima sudut wajib plus satu kantong foto tambahan. */
const SLOT_POSITIONS: HandoverPhotoPosition[] = [...PHOTO_POSITIONS, "OTHER"]

export type HandoverResult = {
  id: string
  type: HandoverType
  photos: number
}

function typeRejection(type: HandoverType, status: string): string | null {
  if (type === "PICKUP") {
    return status === "CONFIRMED" || status === "ONGOING"
      ? null
      : "Checklist pengambilan hanya untuk pesanan yang sudah dikonfirmasi."
  }
  return status === "ONGOING" ? null : "Checklist pengembalian hanya untuk sewa yang sedang berjalan."
}

/**
 * Menyimpan satu checklist kondisi kendaraan. Foto diunggah lebih dulu ke
 * penyimpanan, lalu baris Handover + HandoverPhoto ditulis dalam satu transaksi;
 * bila transaksi gagal, file yang baru diunggah dihapus lagi.
 */
export async function saveHandoverAction(formData: FormData): Promise<ActionResult<HandoverResult>> {
  return safeAction(async () => {
    const context = await requireTenant()
    const blocked = requireWritable(context)
    if (blocked) return fail(blocked, { code: "READ_ONLY" })

    const parsed = handoverInput.safeParse({
      code: textOf(formData, "code"),
      type: textOf(formData, "type"),
      odometer: formData.get("odometer") ?? "",
      fuelLevel: formData.get("fuelLevel") ?? "",
      conditionNotes: textOf(formData, "conditionNotes"),
      damageNotes: textOf(formData, "damageNotes"),
    })
    if (!parsed.success) {
      return fail("Periksa isian checklist.", {
        code: "VALIDATION",
        fields: fieldErrorsFromZod(parsed.error, handoverFieldLabels),
      })
    }
    const input = parsed.data

    const booking = await prisma.booking.findFirst({
      where: { tenantId: context.tenant.id, code: input.code },
      select: {
        id: true,
        code: true,
        status: true,
        vehicleId: true,
        vehicle: { select: { odometer: true } },
      },
    })
    if (!booking) {
      return fail(`Kode booking ${input.code} tidak ditemukan di rental ini.`, {
        code: "NOT_FOUND",
        fields: { code: "Kode ini tidak dikenal" },
      })
    }

    const rejection = typeRejection(input.type, booking.status)
    if (rejection) return fail(rejection, { code: "CONFLICT" })

    if (input.type === "RETURN" && input.odometer !== null) {
      const pickup = await prisma.handover.findFirst({
        where: { bookingId: booking.id, type: "PICKUP" },
        orderBy: { createdAt: "desc" },
        select: { odometer: true },
      })
      const reference = pickup?.odometer ?? booking.vehicle.odometer
      if (reference !== null && input.odometer < reference) {
        return fail("Odometer kembali tidak boleh lebih kecil dari odometer pengambilan.", {
          code: "VALIDATION",
          fields: { odometer: `Minimal ${reference.toLocaleString("id-ID")} km` },
        })
      }
    }

    const incoming: { position: HandoverPhotoPosition; file: File }[] = []
    for (const position of SLOT_POSITIONS) {
      for (const item of formData.getAll(`photo-${position}`)) {
        if (item instanceof File && item.size > 0) incoming.push({ position, file: item })
      }
    }
    if (incoming.length > MAX_HANDOVER_PHOTOS) {
      return fail(`Maksimal ${MAX_HANDOVER_PHOTOS} foto per checklist.`, { code: "VALIDATION" })
    }

    let stored: StoredFile[] = []
    try {
      stored = await Promise.all(incoming.map((item) => uploadImage(item.file, `handovers/${context.tenant.slug}`)))

      const created = await prisma.$transaction(async (tx) => {
        const handover = await tx.handover.create({
          data: {
            bookingId: booking.id,
            tenantId: context.tenant.id,
            type: input.type,
            odometer: input.odometer,
            fuelLevel: input.fuelLevel ?? null,
            conditionNotes: input.conditionNotes || null,
            damageNotes: input.damageNotes || null,
            recordedById: context.user.id,
          },
          select: { id: true },
        })

        if (stored.length) {
          await tx.handoverPhoto.createMany({
            data: stored.map((item, index) => ({
              handoverId: handover.id,
              url: item.url,
              storageKey: item.storageKey,
              position: incoming[index]?.position ?? "OTHER",
            })),
          })
        }

        // Kilometer terakhir kendaraan mengikuti angka terbesar, supaya koreksi
        // checklist lama tidak menurunkan catatan armada.
        if (input.odometer !== null) {
          const current = booking.vehicle.odometer ?? 0
          if (input.odometer > current) {
            await tx.vehicle.update({ where: { id: booking.vehicleId }, data: { odometer: input.odometer } })
          }
        }

        return { id: handover.id, photos: stored.length }
      }, TX_OPTIONS)

      revalidatePath(`/dashboard/bookings/${booking.code}`)
      revalidatePath("/dashboard/bookings")
      revalidatePath("/dashboard/vehicles")
      revalidatePath(`/${context.tenant.slug}/booking/${booking.code}`)

      return ok({ id: created.id, type: input.type, photos: created.photos })
    } catch (error) {
      if (stored.length) {
        await deleteImages(stored).catch(() => undefined)
      }
      if (error instanceof StorageError) return fail(error.message, { code: "VALIDATION" })
      throw error
    }
  })
}
