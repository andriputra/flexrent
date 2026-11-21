import { calculateRentalPrice, type PriceBreakdown, type Tariffs } from "@/lib/pricing"

export type QuoteOptions = {
  tariffs: Tariffs
  days: number
  withDriver?: boolean
  /** tarif sopir per hari (kolom driverFee pada kendaraan) */
  driverFeePerDay?: number | null
  /** biaya antar-jemput sekali jalan */
  deliveryFee?: number | null
  deposit?: number | null
}

export type Quote = {
  days: number
  rental: PriceBreakdown
  rentalAmount: number
  driverAmount: number
  deliveryAmount: number
  depositAmount: number
  totalAmount: number
}

/**
 * Rincian biaya yang selalu dihitung ulang di server dari harga yang tersimpan
 * di database — angka dari klien hanya dipakai sebagai pilihan (sopir/antar).
 */
export function quoteRental(options: QuoteOptions): Quote {
  const rental = calculateRentalPrice(options.tariffs, options.days)
  const driverAmount = options.withDriver
    ? Math.max(0, Math.round(options.driverFeePerDay ?? 0)) * rental.days
    : 0
  const deliveryAmount = Math.max(0, Math.round(options.deliveryFee ?? 0))
  const depositAmount = Math.max(0, Math.round(options.deposit ?? 0))

  return {
    days: rental.days,
    rental,
    rentalAmount: rental.amount,
    driverAmount,
    deliveryAmount,
    depositAmount,
    totalAmount: rental.amount + driverAmount + deliveryAmount + depositAmount,
  }
}
