"use server"

import { redirect } from "next/navigation"
import { signIn, signOut } from "@/lib/auth"
import { ipRateRejection } from "@/lib/anti-abuse"
import { isRedirectError } from "@/lib/result"

export async function signInWithGoogleAction(redirectTo = "/dashboard") {
  try {
    await signIn("google", { redirectTo })
  } catch (error) {
    if (isRedirectError(error)) throw error
    redirect("/login?error=google")
  }
}

/** Magic link: tanpa SMTP_HOST tautan dicetak ke terminal (lihat lib/auth.ts). */
export async function signInWithEmailAction(email: string, redirectTo = "/dashboard") {
  const clean = email.trim().toLowerCase()
  if (!/^\S+@\S+\.\S+$/.test(clean)) {
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
