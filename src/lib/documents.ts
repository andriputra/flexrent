import { createHmac, timingSafeEqual } from "node:crypto"
import type { DocumentType } from "@prisma/client"

export const DOCUMENT_LABEL: Record<DocumentType, string> = {
  KTP: "KTP",
  SIM: "SIM",
  OTHER: "Dokumen lain",
}

/**
 * Tautan dokumen (KTP/SIM) berumur pendek. Route /api/dokumen/[id] tetap menuntut
 * sesi staf tenant pemilik dokumen; tanda tangan ini yang membuat URL tidak bisa
 * dipakai lagi setelah beberapa menit atau disalin orang lain.
 */
const DEFAULT_TTL_MINUTES = 5

function signingSecret(): string {
  const value = process.env.DOCUMENT_SECRET ?? process.env.AUTH_SECRET
  if (!value) throw new Error("AUTH_SECRET belum diisi, tautan dokumen tidak dapat dibuat.")
  return value
}

function signature(payload: string): string {
  return createHmac("sha256", signingSecret()).update(payload).digest("hex")
}

export function documentViewLink(documentId: string, ttlMinutes = DEFAULT_TTL_MINUTES): string {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlMinutes * 60
  const sig = signature(`${documentId}.${expiresAt}`)
  return `/api/dokumen/${documentId}?e=${expiresAt}&s=${sig}`
}

export function verifyDocumentLink(documentId: string, expiresRaw: string, signatureRaw: string): boolean {
  const expiresAt = Number(expiresRaw)
  if (!Number.isInteger(expiresAt) || expiresAt * 1000 < Date.now()) return false
  if (!/^[\da-f]{64}$/i.test(signatureRaw)) return false

  const expected = Buffer.from(signature(`${documentId}.${expiresAt}`), "hex")
  const received = Buffer.from(signatureRaw, "hex")
  return expected.length === received.length && timingSafeEqual(expected, received)
}
