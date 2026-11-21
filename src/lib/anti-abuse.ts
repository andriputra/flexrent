import { headers } from "next/headers"
import { fail } from "@/lib/result"
import { verifyFormTicket } from "@/lib/form-ticket"
import { clientIp, consumeRate, RATE_RULES } from "@/lib/rate-limit"

/** Medan jebakan: bot pengisi otomatis menulis di semua input, manusia tidak melihatnya. */
export const HONEYPOT_FIELD = "company"
export const TICKET_FIELD = "ticket"

export type SpamCheck = {
  scope: keyof typeof RATE_RULES
  /** Identitas tambahan (slug, email) — alamat IP sudah ditambahkan pembantu ini. */
  identity: string
  /** Isi bila form menerbitkan tiket; lewati properti ini untuk form tanpa tiket. */
  ticketBinding?: string
}

type Rejection = ReturnType<typeof fail>

/** Pembatasan laju per alamat IP + identitas (email, slug) untuk alur tanpa form. */
export async function ipRateRejection(
  scope: keyof typeof RATE_RULES,
  identity: string
): Promise<Rejection | null> {
  const ip = clientIp(await headers())
  const decision = await consumeRate(scope, `${ip}:${identity}`, RATE_RULES[scope])
  if (decision.allowed) return null

  const minutes = Math.max(1, Math.ceil(decision.retryAfterSec / 60))
  return fail(`Terlalu sering mengirim dalam waktu singkat. Coba lagi dalam ${minutes} menit.`, { code: "VALIDATION" })
}

/** Rangkaian penolakan pra-DB untuk form publik: honeypot, tiket, lalu ambang per IP. */
export async function spamRejection(formData: FormData, check: SpamCheck): Promise<Rejection | null> {
  if (String(formData.get(HONEYPOT_FIELD) ?? "").trim() !== "") return fail("Pesanan tidak dapat diproses.", { code: "VALIDATION" })

  if (check.ticketBinding !== undefined) {
    const ticket = String(formData.get(TICKET_FIELD) ?? "")
    if (!verifyFormTicket(ticket, check.ticketBinding)) {
      return fail("Halaman sudah terlalu lama terbuka. Muat ulang, lalu kirim lagi.", { code: "VALIDATION" })
    }
  }

  return ipRateRejection(check.scope, check.identity)
}
