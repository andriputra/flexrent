"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { textOf } from "@/lib/form"
import { fieldErrorsFromZod, fail, ok, safeAction, type ActionResult } from "@/lib/result"
import { requireTenant, requireWritable } from "@/lib/tenant"
import { customerBlacklistInput, customerFieldLabels, documentVerificationInput } from "@/lib/validators/customer"

/**
 * Masuk daftar hitam memblokir pesanan baru lewat `findBlockedCustomer`.
 * Alasan disimpan supaya staf lain tahu kenapa pelanggan ini dihentikan.
 */
export async function setCustomerBlacklistAction(formData: FormData): Promise<ActionResult<{ isBlacklisted: boolean }>> {
  return safeAction(async () => {
    const context = await requireTenant()
    const blocked = requireWritable(context)
    if (blocked) return fail(blocked, { code: "READ_ONLY" })

    const parsed = customerBlacklistInput.safeParse({
      id: textOf(formData, "id"),
      isBlacklisted: formData.get("isBlacklisted") ?? "false",
      reason: textOf(formData, "reason"),
    })
    if (!parsed.success) {
      return fail("Periksa isian daftar hitam.", {
        code: "VALIDATION",
        fields: fieldErrorsFromZod(parsed.error, customerFieldLabels),
      })
    }
    const input = parsed.data

    const updated = await prisma.customer.updateMany({
      where: { id: input.id, tenantId: context.tenant.id },
      data: {
        isBlacklisted: input.isBlacklisted,
        blacklistReason: input.isBlacklisted ? input.reason : null,
      },
    })
    if (updated.count === 0) return fail("Pelanggan tidak ditemukan.", { code: "NOT_FOUND" })

    revalidatePath("/dashboard/customers")
    revalidatePath(`/dashboard/customers/${input.id}`)
    return ok({ isBlacklisted: input.isBlacklisted })
  })
}

/** Setujui atau cabut verifikasi satu dokumen KTP/SIM pelanggan. */
export async function setDocumentVerifiedAction(
  formData: FormData
): Promise<ActionResult<{ fileName: string; isVerified: boolean }>> {
  return safeAction(async () => {
    const context = await requireTenant()
    const blocked = requireWritable(context)
    if (blocked) return fail(blocked, { code: "READ_ONLY" })

    const parsed = documentVerificationInput.safeParse({
      documentId: textOf(formData, "documentId"),
      isVerified: formData.get("isVerified") ?? "false",
    })
    if (!parsed.success) {
      return fail("Dokumen tidak valid.", {
        code: "VALIDATION",
        fields: fieldErrorsFromZod(parsed.error, customerFieldLabels),
      })
    }

    const document = await prisma.document.findFirst({
      where: { id: parsed.data.documentId, tenantId: context.tenant.id },
      select: { id: true, fileName: true, customerId: true, booking: { select: { code: true } } },
    })
    if (!document) return fail("Dokumen tidak ditemukan.", { code: "NOT_FOUND" })

    await prisma.document.update({
      where: { id: document.id },
      data: {
        isVerified: parsed.data.isVerified,
        verifiedAt: parsed.data.isVerified ? new Date() : null,
      },
    })

    if (document.customerId) revalidatePath(`/dashboard/customers/${document.customerId}`)
    if (document.booking?.code) {
      revalidatePath(`/dashboard/bookings/${document.booking.code}`)
    }
    revalidatePath("/dashboard/customers")

    return ok({ fileName: document.fileName, isVerified: parsed.data.isVerified })
  })
}
