import { createHash } from "node:crypto"
import { afterEach, describe, expect, it, vi } from "vitest"
import { bookingCodeFromOrderId, kindFromOrderId, orderIdFor } from "./provider"
import { getPaymentProvider, isMidtransConfigured, midtransOutcome, midtransProvider, midtransSignature } from "./midtrans"

const KEY = "SB-Midtrans-server-key-abc123"

function sign(payload: Record<string, string | number>): string {
  return midtransSignature(String(payload.order_id), String(payload.status_code), String(payload.gross_amount), KEY)
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("midtransSignature", () => {
  it("mengikuti urutan konkatenasi dokumen Midtrans", () => {
    const expected = createHash("sha512").update(`BR-2611-0001-R2001500000${KEY}`).digest("hex")
    expect(midtransSignature("BR-2611-0001-R", "200", "1500000", KEY)).toBe(expected)
    expect(midtransSignature("BR-2611-0001-R", "200", "1500000", KEY)).toHaveLength(128)
  })

  it("berubah saat salah satu komponen berubah", () => {
    const base = midtransSignature("BR-2611-0001-R", "200", "1500000", KEY)
    expect(midtransSignature("BR-2611-0002-R", "200", "1500000", KEY)).not.toBe(base)
    expect(midtransSignature("BR-2611-0001-R", "404", "1500000", KEY)).not.toBe(base)
    expect(midtransSignature("BR-2611-0001-R", "200", "150000", KEY)).not.toBe(base)
    expect(midtransSignature("BR-2611-0001-R", "200", "1500000", "kunci lain")).not.toBe(base)
  })
})

describe("midtransOutcome", () => {
  it.each([
    ["settlement", null, "SETTLED"],
    ["capture", "accept", "SETTLED"],
    ["capture", "challenge", "PENDING"],
    ["expire", null, "EXPIRED"],
    ["cancel", null, "FAILED"],
    ["deny", null, "FAILED"],
    ["pending", null, "PENDING"],
    ["unknown-status", null, "PENDING"],
  ] as const)("%s -> %s", (status, fraud, outcome) => {
    expect(midtransOutcome(status, fraud)).toBe(outcome)
  })
})

describe("midtransProvider.parseEvent", () => {
  const body = {
    order_id: "BR-2611-0001-R",
    status_code: "200",
    gross_amount: "1500000",
    transaction_id: "c1a6a9f0-1234-5678-90ab-cdef01234567",
    transaction_status: "settlement",
  }

  it("menerima notifikasi bertanda tangan sah", () => {
    vi.stubEnv("MIDTRANS_SERVER_KEY", KEY)
    const raw = JSON.stringify(body)
    const event = midtransProvider.parseEvent(raw, sign(body))
    expect(event).toMatchObject({
      orderId: "BR-2611-0001-R",
      transactionId: body.transaction_id,
      statusCode: "200",
      amount: 1_500_000,
      outcome: "SETTLED",
    })
  })

  it("menolak tanda tangan yang tidak cocok", () => {
    vi.stubEnv("MIDTRANS_SERVER_KEY", KEY)
    expect(midtransProvider.parseEvent(JSON.stringify(body), sign({ ...body, gross_amount: "1" }))).toBeNull()
  })

  it("menolak body yang diubah setelah ditandatangani", () => {
    vi.stubEnv("MIDTRANS_SERVER_KEY", KEY)
    const signature = sign(body)
    const tampered = JSON.stringify({ ...body, gross_amount: "9900000" })
    expect(midtransProvider.parseEvent(tampered, signature)).toBeNull()
  })

  it.each([
    ["tanpa header signature", JSON.stringify(body), null],
    ["signature bukan hex 128", JSON.stringify(body), "deadbeef"],
    ["body rusak", "bukan json", "a".repeat(128)],
    ["field wajib hilang", JSON.stringify({ order_id: "BR-2611-0001-R", transaction_status: "settlement" }), "a".repeat(128)],
  ])("mengabaikan %s", (_label, raw, signature) => {
    vi.stubEnv("MIDTRANS_SERVER_KEY", KEY)
    expect(midtransProvider.parseEvent(raw, signature)).toBeNull()
  })

  it("menerima signature_response string di body (Snap mengirim tanpa header)", () => {
    vi.stubEnv("MIDTRANS_SERVER_KEY", KEY)
    const raw = JSON.stringify({ ...body, signature_response: sign(body) })
    expect(midtransProvider.parseEvent(raw, null)).toMatchObject({ outcome: "SETTLED", amount: 1_500_000 })
  })

  it("menerima signature_response array untuk transaksi kartu kredit", () => {
    vi.stubEnv("MIDTRANS_SERVER_KEY", KEY)
    const raw = JSON.stringify({
      ...body,
      signature_response: [{ transaction_id: body.transaction_id, sign_method: "SHA512", signature: sign(body) }],
    })
    expect(midtransProvider.parseEvent(raw, null)?.outcome).toBe("SETTLED")
  })

  it("menerima body form-urlencoded", () => {
    vi.stubEnv("MIDTRANS_SERVER_KEY", KEY)
    const form = new URLSearchParams({ ...body, signature_response: sign(body) })
    expect(midtransProvider.parseEvent(form.toString(), null)?.orderId).toBe("BR-2611-0001-R")
  })

  it("menolak semua kandidat tanda tangan yang tidak cocok", () => {
    vi.stubEnv("MIDTRANS_SERVER_KEY", KEY)
    const raw = JSON.stringify({ ...body, signature_response: "f".repeat(128) })
    expect(midtransProvider.parseEvent(raw, sign({ ...body, gross_amount: "1" }))).toBeNull()
  })

  it("tidak aktif tanpa MIDTRANS_SERVER_KEY", () => {
    vi.stubEnv("MIDTRANS_SERVER_KEY", "")
    expect(isMidtransConfigured()).toBe(false)
    expect(getPaymentProvider()).toBeNull()
  })
})

describe("orderId", () => {
  it("suffiks jenis bisa dibaca balik", () => {
    expect(orderIdFor("BR-2611-0001", "RENTAL")).toBe("BR-2611-0001-R")
    expect(orderIdFor("BR-2611-0001", "DEPOSIT")).toBe("BR-2611-0001-D")
    expect(bookingCodeFromOrderId("BR-2611-0001-R")).toBe("BR-2611-0001")
    expect(kindFromOrderId("BR-2611-0001-D")).toBe("DEPOSIT")
    expect(kindFromOrderId("BR-2611-0001-R")).toBe("RENTAL")
  })

  it("kode tanpa suffiks tetap dikembalikan apa adanya", () => {
    expect(bookingCodeFromOrderId("BR26110001")).toBe("BR26110001")
    expect(kindFromOrderId("BR26110001")).toBe("RENTAL")
  })

  it("percobaan ulang membaca balik ke kode dan jenis yang sama", () => {
    const orderId = orderIdFor("BR-2611-0001", "DEPOSIT", "261121213000")
    expect(orderId).toBe("BR-2611-0001-D-261121213000")
    expect(bookingCodeFromOrderId(orderId)).toBe("BR-2611-0001")
    expect(kindFromOrderId(orderId)).toBe("DEPOSIT")
  })
})
