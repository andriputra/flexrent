/**
 * Abstraksi pembayaran. Halaman publik dan webhook hanya bicara lewat tipe di
 * bawah ini, jadi Midtrans bisa ditukar Xendit tanpa menyentuh server action.
 */

export type PaymentKindKey = "RENTAL" | "DEPOSIT" | "SUBSCRIPTION"

export type CheckoutRequest = {
  orderId: string
  amount: number
  title: string
  description: string
  customer: { name: string; phone: string; email?: string | null }
  /** URL tempat Midtrans mengembalikan pelanggan setelah bayar. */
  finishUrl: string
}

export type CheckoutResult = {
  orderId: string
  redirectUrl: string
}

export type PaymentOutcome = "SETTLED" | "FAILED" | "EXPIRED" | "PENDING"

export type PaymentEvent = {
  orderId: string
  transactionId: string
  statusCode: string
  amount: number
  outcome: PaymentOutcome
}

export interface PaymentProvider {
  readonly id: "midtrans"
  createCheckout(request: CheckoutRequest): Promise<CheckoutResult>
  /**
   * Memverifikasi signature dan menormalisasi payload. Mengembalikan null kalau
   * tanda tangan tidak cocok — pemanggil wajib membalas 403, bukan memproses.
   */
  parseEvent(rawBody: string, signature: string | null): PaymentEvent | null
}

export class PaymentProviderError extends Error {}

const KIND_SUFFIX: Record<PaymentKindKey, string> = { RENTAL: "R", DEPOSIT: "D", SUBSCRIPTION: "I" }
const SUFFIX_KIND = { R: "RENTAL", D: "DEPOSIT", I: "SUBSCRIPTION" } as const

const ORDER_ID_PATTERN = /^(.+)-(R|D|I)(?:-(\d{4,14}))?$/

/**
 * order_id Midtrans harus unik. Untuk tagihan sewa `subject` adalah kode booking,
 * untuk tagihan langganan itu nomor invoice. `attempt` dipakai saat pelanggan
 * menekan bayar lagi supaya transaksi baru tidak menabrak order_id lama.
 */
export function orderIdFor(subject: string, kind: PaymentKindKey, attempt?: string): string {
  const base = `${subject}-${KIND_SUFFIX[kind]}`
  return attempt ? `${base}-${attempt}` : base
}

export function parseOrderId(orderId: string): { code: string; kind: PaymentKindKey } | null {
  const match = ORDER_ID_PATTERN.exec(orderId)
  if (!match) return null
  return { code: match[1], kind: SUFFIX_KIND[match[2] as keyof typeof SUFFIX_KIND] }
}

export function bookingCodeFromOrderId(orderId: string): string {
  return parseOrderId(orderId)?.code ?? orderId
}

export function kindFromOrderId(orderId: string): PaymentKindKey {
  return parseOrderId(orderId)?.kind ?? "RENTAL"
}
