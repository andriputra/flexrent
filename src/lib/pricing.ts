export type Tariffs = {
  priceDaily: number
  priceWeekly?: number | null
  priceMonthly?: number | null
}

export type PriceBreakdown = {
  days: number
  months: number
  weeks: number
  remainderDays: number
  amount: number
  /** label otomatis, mis. "2 minggu + 1 hari". */
  scheme: string
}

const DAYS_PER_WEEK = 7
const DAYS_PER_MONTH = 30
/** Batas enumerasi supaya input absurd tidak mengunci server. */
const MAX_DAYS = 366

/**
 * Memilih kombinasi termurah dari tarif harian, mingguan, dan bulanan.
 * Kombinasi boleh membeli blok lebih panjang dari durasi sewa bila hasilnya
 * lebih murah (mis. 25 hari memakai 1 bulan).
 */
export function calculateRentalPrice(tariffs: Tariffs, days: number): PriceBreakdown {
  const safeDays = Math.max(1, Math.min(Math.floor(days), MAX_DAYS))
  const { priceDaily, priceWeekly, priceMonthly } = tariffs

  let best: PriceBreakdown = {
    days: safeDays,
    months: 0,
    weeks: 0,
    remainderDays: safeDays,
    amount: priceDaily * safeDays,
    scheme: describeScheme(0, 0, safeDays),
  }

  const maxMonths = priceMonthly ? Math.ceil(safeDays / DAYS_PER_MONTH) : 0
  for (let months = 0; months <= maxMonths; months += 1) {
    const afterMonths = Math.max(0, safeDays - months * DAYS_PER_MONTH)
    const maxWeeks = priceWeekly ? Math.ceil(afterMonths / DAYS_PER_WEEK) : 0
    for (let weeks = 0; weeks <= maxWeeks; weeks += 1) {
      const remainderDays = Math.max(0, afterMonths - weeks * DAYS_PER_WEEK)
      // months/weeks selalu 0 bila tarif bloknya tidak diisi (lihat maxMonths/maxWeeks).
      const amount =
        months * (priceMonthly ?? 0) +
        weeks * (priceWeekly ?? 0) +
        remainderDays * priceDaily
      if (amount < best.amount) {
        best = {
          days: safeDays,
          months,
          weeks,
          remainderDays,
          amount,
          scheme: describeScheme(months, weeks, remainderDays),
        }
      }
    }
  }

  return best
}

function describeScheme(months: number, weeks: number, days: number): string {
  const parts: string[] = []
  if (months) parts.push(`${months} bulan`)
  if (weeks) parts.push(`${weeks} minggu`)
  if (days) parts.push(`${days} hari`)
  if (!parts.length) return "1 hari"
  return parts.join(" + ")
}
