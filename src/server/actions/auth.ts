"use server"

import { redirect } from "next/navigation"
import { CredentialsSignin } from "next-auth"
import { prisma } from "@/lib/db"
import { signIn, signOut } from "@/lib/auth"
import { ipRateRejection } from "@/lib/anti-abuse"
import { hashPassword, passwordWeakness } from "@/lib/password"
import { isRedirectError } from "@/lib/result"

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function emailMalformed(email: string): boolean {
  return !/^\S+@\S+\.\S+$/.test(email)
}

export async function signInWithGoogleAction(redirectTo = "/dashboard") {
  try {
    await signIn("google", { redirectTo })
  } catch (error) {
    if (isRedirectError(error)) throw error
    redirect("/login?error=google")
  }
}

/** Email + sandi. Cara masuk utama selama SMTP belum terpasang. */
export async function signInWithPasswordAction(email: string, password: string) {
  const clean = normalizeEmail(email)
  if (emailMalformed(clean) || !password) {
    return { ok: false as const, error: "Isi email dan sandi Anda." }
  }
  const throttled = await ipRateRejection("login", clean)
  if (throttled) return { ok: false as const, error: throttled.error }

  try {
    await signIn("credentials", { email: clean, password, redirect: false })
  } catch (error) {
    if (isRedirectError(error)) throw error
    if (error instanceof CredentialsSignin) {
      return { ok: false as const, error: "Email atau sandi tidak cocok." }
    }
    return { ok: false as const, error: "Terjadi kesalahan saat masuk. Coba lagi sebentar." }
  }
  // Tujuan selalu relatif: URL hasil Auth.js memakai AUTH_URL yang belum tentu
  // sama dengan origin yang sedang dibuka browser.
  return { ok: true as const, data: "/dashboard" }
}

/**
 * Daftar akun baru dengan email + sandi. Sengaja tidak memakai adapter Auth.js:
 * provider credentials tidak membuatkan user, jadi barisnya dibuat di sini
 * sebelum sesi pertama dibuka.
 */
export async function registerWithPasswordAction(name: string, email: string, password: string) {
  const clean = normalizeEmail(email)
  const nama = name.trim()
  if (nama.length < 2) {
    return { ok: false as const, error: "Nama minimal 2 karakter." }
  }
  if (emailMalformed(clean)) {
    return { ok: false as const, error: "Email tidak valid." }
  }
  const weak = passwordWeakness(password)
  if (weak) return { ok: false as const, error: weak }

  const throttled = await ipRateRejection("register", clean)
  if (throttled) return { ok: false as const, error: throttled.error }

  const taken = await prisma.user.findUnique({ where: { email: clean }, select: { id: true } })
  if (taken) {
    return { ok: false as const, error: "Email ini sudah punya akun. Silakan masuk." }
  }

  // emailVerified sengaja tidak diisi: belum ada bukti kepemilikan mailbox
  // selama SMTP mati. Lihat README "Belum dikerjakan" soal celah pre-register.
  await prisma.user.create({
    data: { email: clean, name: nama, passwordHash: await hashPassword(password) },
  })

  try {
    await signIn("credentials", { email: clean, password, redirect: false })
  } catch (error) {
    if (isRedirectError(error)) throw error
    // Akun sudah terbuat tapi sesi belum terbuka; suruh masuk sekali saja
    // supaya tidak mendaftar dua kali.
    return { ok: false as const, error: "Akun berhasil dibuat. Silakan masuk dengan sandi baru Anda." }
  }
  return { ok: true as const, data: "/onboarding" }
}

/** Magic link: tanpa SMTP_HOST tautan dicetak ke terminal (lihat lib/auth.ts). */
export async function signInWithEmailAction(email: string, redirectTo = "/dashboard") {
  const clean = normalizeEmail(email)
  if (emailMalformed(clean)) {
    return { ok: false as const, error: "Email tidak valid." }
  }
  const throttled = await ipRateRejection("login", clean)
  if (throttled) return { ok: false as const, error: throttled.error }
  try {
    await signIn("nodemailer", { email: clean, redirectTo })
  } catch (error) {
    if (isRedirectError(error)) throw error
    return { ok: false as const, error: "Gagal mengirim tautan masuk. Coba beberapa saat lagi." }
  }
  return { ok: true as const, data: clean }
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" })
}
