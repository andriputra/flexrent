import { addDays, diffInCalendarDays, fromWib, toDayKey, toTimeKey } from "@/lib/datetime"

/**
 * Siklus tagihan. Harga tahunan tersedia di tabel Plan tapi belum dipakai sebagai
 * siklus karena diskon dan jatuh temponya belum diputuskan — langganan berjalan
 * bulanan (asumsi Fase 6, lihat README).
 */
export const BILLING_MONTHS = 1

/** Hari tenggat bayar setelah periode berjalan habis. */
export const INVOICE_GRACE_DAYS = 3

/** Pengingat perpanjangan dikirim pada H-7, H-3, dan H-1. */
export const RENEWAL_MILESTONES = [7, 3, 1] as const

export type PlanPriced = { priceMonthly: number }

/** Harga satu periode tagihan. */
export function planPrice(plan: PlanPriced): number {
  return Math.max(0, plan.priceMonthly)
}

/**
 * Menambah bulan dengan hari yang dipangkas ke ujung bulan target, supaya
 * 31 Jan + 1 bulan tidak pernah melompat ke awal Maret.
 */
export function addMonthsWib(date: Date, months: number): Date {
  const [year, month, day] = toDayKey(date).split("-").map(Number)
  const anchor = new Date(Date.UTC(year, month - 1 + months, 1))
  const lastDay = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0)).getUTCDate()
  const shiftedDay = String(Math.min(day, lastDay)).padStart(2, "0")
  const shiftedMonth = String(anchor.getUTCMonth() + 1).padStart(2, "0")
  return fromWib(`${anchor.getUTCFullYear()}-${shiftedMonth}-${shiftedDay}`, toTimeKey(date))
}

/** Periode tagihan berikutnya: mulai tepat saat periode sekarang habis. */
export function nextBillingPeriod(currentPeriodEnd: Date): { start: Date; end: Date } {
  const start = currentPeriodEnd
  return { start, end: addMonthsWib(start, BILLING_MONTHS) }
}

/** Sisa hari kalender sampai jatuh tempo; 0 = hari ini, negatif = sudah lewat. */
export function daysToRenewal(periodEnd: Date, now = new Date()): number {
  return diffInCalendarDays(now, periodEnd)
}

/**
 * Melebar pengingat yang cocok hari ini (7/3/1), atau null bila hari ini bukan
 * hari pengingat. Dipakai cron supaya H-7 tidak terkirim dua kali di hari berbeda.
 */
export function renewalMilestone(periodEnd: Date, now = new Date()): number | null {
  const left = daysToRenewal(periodEnd, now)
  return (RENEWAL_MILESTONES as readonly number[]).includes(left) ? left : null
}

/**
 * Nomor invoice: INV-YYMM-urut. Urutan dihitung per bulan agar mudah dibaca staf;
 * keunikannya tetap dijaga kolom unique, jadi pemanggil mengulang bila dua tenant
 * minta nomor yang sama.
 */
export function invoiceNumberFor(periodStart: Date, sequence: number): string {
  const [year, month] = toDayKey(periodStart).split("-")
  return `INV-${year.slice(2)}${month}-${String(Math.max(1, sequence)).padStart(4, "0")}`
}

/** Rentang waktu untuk mencari invoice yang nomornya berasal dari bulan yang sama. */
export function invoiceMonthRange(periodStart: Date): { gte: Date; lt: Date } {
  const [year, month] = toDayKey(periodStart).split("-")
  const gte = fromWib(`${year}-${month}-01`)
  return { gte, lt: addMonthsWib(gte, 1) }
}

/** Tenggat bayar: beberapa hari setelah periode baru berjalan. */
export function invoiceDueAt(periodStart: Date): Date {
  return addDays(periodStart, INVOICE_GRACE_DAYS)
}

/** Invoice dianggap menagih periode yang sama dengan langganan. */
export function coversPeriod(
  invoice: { periodStart: Date; periodEnd: Date },
  period: { start: Date; end: Date }
): boolean {
  return invoice.periodStart.getTime() === period.start.getTime() && invoice.periodEnd.getTime() === period.end.getTime()
}
