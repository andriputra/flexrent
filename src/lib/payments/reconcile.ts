import type { BookingPaymentStatus, BookingStatus, PaymentKind, PaymentStatus } from "@prisma/client"

export type ReconcileBooking = {
  status: BookingStatus
  totalAmount: number
  depositAmount: number
  lateFee: number
  damageFee: number
}

export type ReconcilePayment = {
  kind: PaymentKind
  status: PaymentStatus
  amount: number
}

export type Reconciled = {
  /** Tagihan sewa yang harus dibayar pelanggan; deposit tidak dihitung (uang titipan). */
  dueAmount: number
  paidAmount: number
  paymentStatus: BookingPaymentStatus
  status: BookingStatus
}

export function rentDueOf(booking: ReconcileBooking): number {
  return Math.max(0, booking.totalAmount - booking.depositAmount + booking.lateFee + booking.damageFee)
}

/**
 * Sumber kebenaran tunggal untuk angka di booking: baik webhook Midtrans maupun
 * pencatatan manual admin lewat fungsi ini, jadi keduanya tidak bisa berbeda.
 */
export function reconcileBooking(booking: ReconcileBooking, payments: ReconcilePayment[]): Reconciled {
  const dueAmount = rentDueOf(booking)
  const paidAmount = payments
    .filter((payment) => payment.kind === "RENTAL" && payment.status === "SETTLED")
    .reduce((sum, payment) => sum + payment.amount, 0)

  const paymentStatus: BookingPaymentStatus =
    paidAmount <= 0 ? "UNPAID" : paidAmount >= dueAmount ? "PAID" : "PARTIAL"

  // Lunas penuh = langsung konfirmasi; sebagian tetap butuh keputusan staf (Fase 5).
  const status: BookingStatus = booking.status === "PENDING" && paymentStatus === "PAID" ? "CONFIRMED" : booking.status

  return { dueAmount, paidAmount, paymentStatus, status }
}
