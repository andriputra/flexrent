import { createHmac, timingSafeEqual } from "node:crypto"

/**
 * Tiket form memaksa bot memuat halaman lebih dulu: tanda tangan dibuat server saat
 * render dan baru berlaku beberapa detik kemudian, jadi POST langsung atau kiriman
 * ulang dari halaman lama ditolak tanpa perlu layanan captcha.
 */
const DEFAULT_TTL_MINUTES = 30
const MIN_AGE_SECONDS = 5

function signingSecret(): string {
  const value = process.env.AUTH_SECRET ?? process.env.DOCUMENT_SECRET
  if (!value) throw new Error("AUTH_SECRET belum diisi, tiket form tidak dapat dibuat.")
  return value
}

function signature(payload: string): string {
  return createHmac("sha256", signingSecret()).update(payload).digest("hex")
}

export function issueFormTicket(binding = ""): string {
  const issuedAt = Math.floor(Date.now() / 1000)
  return `${issuedAt}.${signature(`${binding}.${issuedAt}`)}`
}

/** Binding harus sama dengan saat tiket diterbitkan supaya token tidak bisa dipindah antar form. */
export function verifyFormTicket(token: string, binding = ""): boolean {
  const [issuedRaw, sigRaw] = token.split(".")
  const issuedAt = Number(issuedRaw)
  if (!Number.isInteger(issuedAt) || !/^[\da-f]{64}$/i.test(sigRaw ?? "")) return false

  const age = Math.floor(Date.now() / 1000) - issuedAt
  if (age < MIN_AGE_SECONDS || age > DEFAULT_TTL_MINUTES * 60) return false

  const expected = Buffer.from(signature(`${binding}.${issuedAt}`), "hex")
  const received = Buffer.from(sigRaw ?? "", "hex")
  return expected.length === received.length && timingSafeEqual(expected, received)
}
