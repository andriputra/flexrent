import { toDayKey } from "@/lib/datetime"

/** Kunci bulan WIB ("2611") dipakai dalam kode booking BR-YYMM-####. */
export function bookingMonthKey(startsAt: Date): string {
  const key = toDayKey(startsAt)
  return `${key.slice(2, 4)}${key.slice(5, 7)}`
}

export function bookingCodePrefix(startsAt: Date): string {
  return `BR-${bookingMonthKey(startsAt)}-`
}

/** Urutan ke-n dalam satu bulan pengambilan. Nomor global, bukan per tenant. */
export function buildBookingCode(startsAt: Date, seq: number): string {
  const safeSeq = Math.max(1, Math.floor(seq))
  return `${bookingCodePrefix(startsAt)}${String(safeSeq).padStart(4, "0")}`
}
