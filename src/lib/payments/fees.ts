import type { DepositStatus } from "@prisma/client"

/** Saran denda keterlambatan: tarif denda kendaraan × hari telat. 0 bila tidak diatur. */
export function suggestLateFee(lateFeeDaily: number | null | undefined, days: number): number {
  if (!lateFeeDaily || lateFeeDaily <= 0 || days <= 0) return 0
  return Math.round(lateFeeDaily * days)
}

export type DepositPlanInput = {
  /** Deposit yang benar-benar diterima (jumlah baris Payment DEPOSIT yang SETTLED). */
  depositHeld: number
  /** Tagihan sewa yang masih kurang, dihitung sebelum denda baru ditambahkan. */
  outstandingRent: number
  lateFee: number
  damageFee: number
}

export type DepositPlan = {
  /** Bagian denda yang ditutup dari deposit. */
  deduction: number
  /** Uang yang dikembalikan ke pelanggan. */
  refund: number
  depositStatus: DepositStatus
}

/**
 * Urutan potong yang dipakai saat pengembalian: denda dan kerusakan menutup dulu
 * kekurangan bayar sewa, sisanya baru memotong deposit. Deposit tidak pernah
 * dikembalikan lebih besar dari uang yang benar-benar dipegang.
 */
export function depositRefundPlan(input: DepositPlanInput): DepositPlan {
  const held = Math.max(0, input.depositHeld)
  const fines = Math.max(0, input.lateFee) + Math.max(0, input.damageFee)
  const uncovered = Math.max(0, fines - Math.max(0, input.outstandingRent))
  const deduction = Math.min(uncovered, held)
  const refund = held - deduction

  const depositStatus: DepositStatus =
    held <= 0 ? "HELD" : refund >= held ? "REFUNDED" : refund > 0 ? "PARTIAL_REFUNDED" : "FORFEITED"

  return { deduction, refund, depositStatus }
}

export type DepositStateInput = {
  depositHeld: number
  depositReturned: number
  /** Nominal pengembalian yang dicatat staf malam ini. */
  refund: number
  /** Kekurangan bayar sewa sebelum denda baru. */
  outstandingRent: number
  lateFee: number
  damageFee: number
}

/**
 * Status deposit sesudah pengembalian dicatat. Ditentukan dari angka yang benar-benar
 * terjadi (bukan saran), supaya deposit tidak pernah ditandai kembali bila uangnya
 * terpakai menutup denda.
 */
export function depositStatusAfterRefund(input: DepositStateInput): DepositStatus {
  const held = Math.max(0, input.depositHeld)
  const stillHeld = Math.max(0, held - Math.max(0, input.depositReturned))
  const refund = Math.max(0, Math.min(input.refund, stillHeld))
  if (held <= 0) return "HELD"
  if (refund <= 0) {
    const uncovered = Math.max(0, input.lateFee + input.damageFee - Math.max(0, input.outstandingRent))
    return uncovered >= stillHeld && stillHeld > 0 ? "FORFEITED" : "HELD"
  }
  return refund >= stillHeld ? "REFUNDED" : "PARTIAL_REFUNDED"
}
