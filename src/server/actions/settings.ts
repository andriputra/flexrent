"use server"

import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { slugify } from "@/lib/slug"
import { textOf } from "@/lib/form"
import { sendEmail } from "@/lib/email"
import { deleteImages, uploadImage } from "@/lib/storage"
import { termsList } from "@/lib/terms"
import { WEEK_DAYS, type OpeningHour } from "@/lib/opening-hours"
import { fieldErrorsFromZod, fail, ok, safeAction, type ActionResult } from "@/lib/result"
import { requireTenant, requireWritable, type TenantContext } from "@/lib/tenant"
import {
  openingHoursInput,
  staffInviteInput,
  staffInviteFieldLabels,
  tenantFieldLabels,
  tenantProfileInput,
  termsInput,
} from "@/lib/validators/tenant"

function appOrigin(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "")
}

/** Profil, jam buka, syarat, dan staf adalah urusan pemilik/admin rental. */
function onlyManager(context: TenantContext): ReturnType<typeof fail> | null {
  return context.canManage
    ? null
    : fail("Hanya pemilik atau admin rental yang bisa mengubah pengaturan.", { code: "FORBIDDEN" })
}

function locked(context: TenantContext): ReturnType<typeof fail> | null {
  const reason = requireWritable(context)
  return reason ? fail(reason, { code: "READ_ONLY" }) : null
}

/** Kunci penyimpanan logo lama, baik di Vercel Blob (URL http) maupun /public/uploads. */
function storedLogo(url: string) {
  return { url, storageKey: url.startsWith("/uploads/") ? url.replace(/^\//, "") : url }
}

function revalidatePublic(slug: string) {
  revalidatePath(`/${slug}`, "layout")
  revalidatePath("/dashboard")
}

export async function updateTenantProfileAction(
  values: Record<string, string>
): Promise<ActionResult<{ slug: string }>> {
  return safeAction(async () => {
    const context = await requireTenant()
    const blocked = onlyManager(context) ?? locked(context)
    if (blocked) return blocked

    const parsed = tenantProfileInput.safeParse(values)
    if (!parsed.success) {
      return fail("Periksa kembali isian formulir.", {
        code: "VALIDATION",
        fields: fieldErrorsFromZod(parsed.error, tenantFieldLabels),
      })
    }

    const { name, slugInput, city, phone, address, email, tagline } = parsed.data
    const slug = slugify(slugInput || name)

    const taken = await prisma.tenant.findFirst({
      where: { slug, id: { not: context.tenant.id } },
      select: { slug: true },
    })
    if (taken) {
      return fail(`Alamat "/${slug}" sudah dipakai rental lain.`, {
        code: "CONFLICT",
        fields: { slugInput: "Alamat ini sudah dipakai." },
      })
    }

    const tenant = await prisma.tenant.update({
      where: { id: context.tenant.id },
      data: {
        name,
        slug,
        city,
        phone,
        address: address || null,
        email: email || null,
        tagline: tagline || null,
      },
      select: { slug: true },
    })

    revalidatePublic(tenant.slug)
    revalidatePath("/dashboard/settings")
    return ok(tenant)
  })
}

export async function uploadTenantLogoAction(formData: FormData): Promise<ActionResult<null>> {
  return safeAction(async () => {
    const context = await requireTenant()
    const blocked = onlyManager(context) ?? locked(context)
    if (blocked) return blocked

    const file = formData.get("logo")
    if (!(file instanceof File)) return fail("Pilih berkas logo lebih dulu.", { code: "VALIDATION" })

    const previous = context.tenant.logoUrl
    const stored = await uploadImage(file, `logos/${context.tenant.slug}`)
    await prisma.tenant.update({ where: { id: context.tenant.id }, data: { logoUrl: stored.url } })

    // Logo lama dihapus setelah yang baru tersimpan agar halaman publik tidak kosong.
    if (previous) await deleteImages([storedLogo(previous)]).catch(() => undefined)

    revalidatePublic(context.tenant.slug)
    revalidatePath("/dashboard/settings")
    return ok(null)
  })
}

export async function removeTenantLogoAction(): Promise<ActionResult<null>> {
  return safeAction(async () => {
    const context = await requireTenant()
    const blocked = onlyManager(context) ?? locked(context)
    if (blocked) return blocked

    const previous = context.tenant.logoUrl
    if (!previous) return fail("Rental ini belum punya logo.", { code: "VALIDATION" })

    await prisma.tenant.update({ where: { id: context.tenant.id }, data: { logoUrl: null } })
    await deleteImages([storedLogo(previous)]).catch(() => undefined)

    revalidatePublic(context.tenant.slug)
    revalidatePath("/dashboard/settings")
    return ok(null)
  })
}

export async function updateOpeningHoursAction(
  entries: Record<string, string>
): Promise<ActionResult<OpeningHour[]>> {
  return safeAction(async () => {
    const context = await requireTenant()
    const blocked = onlyManager(context) ?? locked(context)
    if (blocked) return blocked

    // Form mengirim field bera indeks: day1, open1, closed1, day2, dst.
    const rows = WEEK_DAYS.map((day, index) => {
      const position = String(index + 1)
      return {
        day: entries[`day${position}`] ?? day,
        open: entries[`open${position}`] ?? "",
        close: entries[`close${position}`] ?? "",
        closed: entries[`closed${position}`] === "on",
      }
    })

    const parsed = openingHoursInput.safeParse({ rows })
    if (!parsed.success) {
      // Path zod berbentuk rows[indeks].open — dipetakan balik ke nama field formulir.
      const fields: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const index = Number(issue.path[1])
        const key = Number.isInteger(index) ? `${String(issue.path[2] ?? "open")}${index + 1}` : "rows"
        fields[key] ??= issue.message
      }
      return fail("Isi jam buka dan tutup dengan format jam (HH:mm) untuk setiap hari.", {
        code: "VALIDATION",
        fields,
      })
    }

    const saved = parsed.data.rows
    await prisma.tenant.update({
      where: { id: context.tenant.id },
      data: { openingHours: saved as unknown as Prisma.InputJsonValue },
    })

    revalidatePublic(context.tenant.slug)
    revalidatePath("/dashboard/settings")
    return ok(saved)
  })
}

export async function updateTermsAction(formData: FormData): Promise<ActionResult<{ count: number }>> {
  return safeAction(async () => {
    const context = await requireTenant()
    const blocked = onlyManager(context) ?? locked(context)
    if (blocked) return blocked

    const parsed = termsInput.safeParse({ terms: textOf(formData, "terms") })
    if (!parsed.success) {
      return fail("Periksa kembali syarat sewa.", {
        code: "VALIDATION",
        fields: fieldErrorsFromZod(parsed.error, { terms: "Syarat sewa" }),
      })
    }

    await prisma.tenant.update({
      where: { id: context.tenant.id },
      data: { terms: parsed.data.terms || null },
    })

    revalidatePublic(context.tenant.slug)
    revalidatePath("/dashboard/settings")
    return ok({ count: termsList(parsed.data.terms || null).length })
  })
}

export type StaffInviteResult = { email: string; joined: boolean; sentEmail: boolean }

/**
 * Undang staf lewat email. Akun dibuat lebih dulu bila email belum pernah masuk,
 * supaya undangan langsung tertaut ke membership. Email undangan berisi tautan
 * masuk (magic link) yang dipakai pemilik rental sendiri.
 */
export async function inviteStaffAction(
  values: Record<string, string>
): Promise<ActionResult<StaffInviteResult>> {
  return safeAction(async () => {
    const context = await requireTenant()
    const blocked = onlyManager(context) ?? locked(context)
    if (blocked) return blocked

    const parsed = staffInviteInput.safeParse({
      email: values.email ?? "",
      role: values.role ?? "STAFF",
      jobTitle: values.jobTitle ?? "",
    })
    if (!parsed.success) {
      return fail("Periksa data staf.", {
        code: "VALIDATION",
        fields: fieldErrorsFromZod(parsed.error, staffInviteFieldLabels),
      })
    }

    const email = parsed.data.email.toLowerCase()
    const limit = context.plan?.maxStaff ?? null

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, memberships: { where: { tenantId: context.tenant.id }, select: { id: true, role: true } } },
    })

    if (existingUser?.memberships.length) {
      const membership = await prisma.membership.findFirst({
        where: { tenantId: context.tenant.id, userId: existingUser.id },
        select: { role: true },
      })
      if (membership?.role === "OWNER") {
        return fail("Email ini adalah pemilik rental, tidak bisa diubah lewat undangan.", { code: "CONFLICT" })
      }
    }

    if (!existingUser?.memberships.length) {
      const active = await prisma.membership.count({ where: { tenantId: context.tenant.id, isActive: true } })
      if (limit !== null && active >= limit) {
        return fail(
          `Paket aktif memuat ${limit} staf. Upgrade paket di halaman Langganan sebelum menambah staf.`,
          { code: "PLAN_LIMIT" }
        )
      }
    }

    const user =
      existingUser ??
      (await prisma.user.create({
        data: { email },
        select: { id: true },
      }))

    await prisma.membership.upsert({
      where: { tenantId_userId: { tenantId: context.tenant.id, userId: user.id } },
      create: {
        tenantId: context.tenant.id,
        userId: user.id,
        role: parsed.data.role,
        jobTitle: parsed.data.jobTitle || null,
        invitedEmail: existingUser ? null : email,
      },
      update: {
        role: parsed.data.role,
        jobTitle: parsed.data.jobTitle || null,
        isActive: true,
        invitedEmail: existingUser ? null : email,
      },
    })

    const link = `${appOrigin()}/login`
    const sentEmail = await sendEmail({
      to: email,
      subject: `Undangan masuk ke ${context.tenant.name}`,
      text: [
        `${context.user.name ?? "Rekan Anda"} mengundang Anda sebagai ${parsed.data.role === "ADMIN" ? "admin" : "staf"} di ${context.tenant.name}.`,
        "",
        `Masuk dengan email ini lewat tautan berikut: ${link}`,
        "Tautan masuk dikirim ke email Anda, tidak perlu kata sandi.",
        "",
        `Kalau Anda tidak merasa diundang, abaikan email ini.`,
      ].join("\n"),
      html: `<p>${context.user.name ?? "Rekan Anda"} mengundang Anda sebagai <strong>${
        parsed.data.role === "ADMIN" ? "admin" : "staf"
      }</strong> di ${context.tenant.name}.</p><p><a href="${link}">Masuk ke Flexrent</a> memakai email ini — tautan masuk dikirim ke email Anda, tanpa kata sandi.</p><p style="color:#64748b;font-size:13px">Kalau Anda tidak merasa diundang, abaikan email ini.</p>`,
    }).catch(() => false)

    revalidatePath("/dashboard/settings")
    return ok({ email, joined: Boolean(existingUser), sentEmail })
  })
}
