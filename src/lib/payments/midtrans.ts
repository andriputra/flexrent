import { createHash, timingSafeEqual } from "node:crypto"
import type { CheckoutRequest, CheckoutResult, PaymentEvent, PaymentOutcome, PaymentProvider } from "./provider"
import { PaymentProviderError } from "./provider"

const SANDBOX_BASE = "https://app.sandbox.midtrans.com"
const LIVE_BASE = "https://app.midtrans.com"

function serverKey(): string {
  const value = process.env.MIDTRANS_SERVER_KEY
  if (!value) throw new PaymentProviderError("Pembayaran online belum aktif di rental ini.")
  return value
}

function baseUrl(): string {
  return process.env.MIDTRANS_IS_SANDBOX === "false" ? LIVE_BASE : SANDBOX_BASE
}

export function isMidtransConfigured(): boolean {
  return Boolean(process.env.MIDTRANS_SERVER_KEY)
}

/** Signature Midtrans: SHA-512 atas order_id + status_code + gross_amount + server key. */
export function midtransSignature(orderId: string, statusCode: string, grossAmount: string, key: string): string {
  return createHash("sha512").update(`${orderId}${statusCode}${grossAmount}${key}`).digest("hex")
}

export function midtransOutcome(status: string, fraudStatus: string | null | undefined): PaymentOutcome {
  switch (status.toLowerCase()) {
    case "settlement":
      return "SETTLED"
    case "capture":
      // Fraud challenge berarti dana masih bisa dibatalkan; anggap belum lunas.
      return fraudStatus === "challenge" ? "PENDING" : "SETTLED"
    case "expire":
    case "expiration":
      return "EXPIRED"
    case "cancel":
    case "deny":
    case "invalid":
    case "failed":
      return "FAILED"
    default:
      return "PENDING"
  }
}

type SnapResponse = { token?: string; redirect_url?: string; status_code?: string; message?: string }

async function createCheckout(request: CheckoutRequest): Promise<CheckoutResult> {
  const response = await fetch(`${baseUrl()}/snap/v2/transaction`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      authorization: `Basic ${Buffer.from(`${serverKey()}:`).toString("base64")}`,
    },
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({
      transaction_details: { order_id: request.orderId, gross_amount: request.amount },
      item_details: [{ id: request.orderId, name: request.title, price: request.amount, quantity: 1 }],
      customer: {
        first_name: request.customer.name,
        phone: request.customer.phone,
        email: request.customer.email ?? undefined,
      },
      callbacks: { finish: request.finishUrl },
      metadata: { description: request.description },
    }),
  })

  const text = await response.text()
  if (!response.ok) {
    console.error("[midtrans] snap gagal", response.status, text.slice(0, 200))
    throw new PaymentProviderError("Pembayaran online sedang tidak tersedia. Coba transfer/manual.")
  }

  let payload: SnapResponse
  try {
    payload = JSON.parse(text) as SnapResponse
  } catch {
    throw new PaymentProviderError("Balasan pembayaran online tidak dikenali.")
  }
  if (!payload.redirect_url) {
    throw new PaymentProviderError("Pembayaran online tidak mengembalikan tautan bayar.")
  }
  return { orderId: request.orderId, redirectUrl: payload.redirect_url }
}

/** Midtrans mengirim JSON atau form-urlencoded, dan tanda tangannya ada di body. */
function bodyFields(rawBody: string): Record<string, unknown> | null {
  try {
    return JSON.parse(rawBody) as Record<string, unknown>
  } catch {
    // Fallback: notifikasi lama memakai content-type application/x-www-form-urlencoded.
  }
  if (!/=/.test(rawBody)) return null
  const parsed: Record<string, unknown> = {}
  for (const [key, value] of new URLSearchParams(rawBody)) parsed[key] = value
  return parsed.order_id ? parsed : null
}

/**
 * `signature_response` berupa string untuk VA/QRIS/e-wallet, dan array objek untuk
 * kartu kredit. Header `signature` dipakai notifikasi core api, jadi ikut diterima.
 */
function candidateSignatures(body: Record<string, unknown>, header: string | null): string[] {
  const out: string[] = []
  const raw = body.signature_response
  if (typeof raw === "string") out.push(raw)
  else if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === "string") out.push(item)
      else if (item && typeof item === "object" && typeof (item as { signature?: unknown }).signature === "string") {
        out.push((item as { signature: string }).signature)
      }
    }
  }
  if (header) out.push(header)
  return out
}

function parseEvent(rawBody: string, headerSignature: string | null): PaymentEvent | null {
  const body = bodyFields(rawBody)
  if (!body) return null

  const orderId = typeof body.order_id === "string" ? body.order_id : ""
  const statusCode = body.status_code == null ? "" : String(body.status_code)
  const grossAmount = body.gross_amount == null ? "" : String(body.gross_amount)
  const transactionId = typeof body.transaction_id === "string" ? body.transaction_id : ""
  const status = typeof body.transaction_status === "string" ? body.transaction_status : ""
  if (!orderId || !statusCode || !grossAmount || !status) return null

  const expected = midtransSignature(orderId, statusCode, grossAmount, serverKey())
  const matches = candidateSignatures(body, headerSignature).some(
    (signature) => /^[\da-f]{128}$/i.test(signature) && timingSafeHex(expected, signature.toLowerCase())
  )
  if (!matches) return null

  return {
    orderId,
    transactionId,
    statusCode,
    amount: Number(grossAmount),
    outcome: midtransOutcome(status, typeof body.fraud_status === "string" ? body.fraud_status : null),
  }
}

function timingSafeHex(expected: string, received: string): boolean {
  const a = Buffer.from(expected, "hex")
  const b = Buffer.from(received, "hex")
  return a.length === b.length && timingSafeEqual(a, b)
}

export const midtransProvider: PaymentProvider = { id: "midtrans", createCheckout, parseEvent }

export function getPaymentProvider(): PaymentProvider | null {
  return isMidtransConfigured() ? midtransProvider : null
}
