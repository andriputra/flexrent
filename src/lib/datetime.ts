// Semua tanggal ditampilkan dalam WIB (Asia/Jakarta) tanpa bergantung pada
// zona waktu mesin — penting karena Vercel berjalan di UTC.

export const TIME_ZONE = "Asia/Jakarta"

const partsFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
})

const DAY_MS = 86_400_000
const WIB_OFFSET_MS = 7 * 3_600_000

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
]
const MONTHS_LONG = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
]
const WEEKDAYS_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]
const WEEKDAYS_LONG = [
  "Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu",
]

function parts(date: Date) {
  const p = partsFormatter.formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(p.find((item) => item.type === type)?.value ?? "0")
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") % 24,
    minute: get("minute"),
    second: get("second"),
  }
}

/** Tanggal WIB sebagai angka hari absolut; dipakai untuk hitung durasi. */
function dayNumber(ms: number) {
  return Math.floor((ms + WIB_OFFSET_MS) / DAY_MS)
}

/** "2026-11-21" dalam kalender WIB. */
export function toDayKey(date: Date): string {
  const p = parts(date)
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`
}

/** "HH:mm" dalam jam WIB. */
export function toTimeKey(date: Date): string {
  const p = parts(date)
  return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`
}

/** Entri input tanggal + jam -> instant WIB. `day` format "YYYY-MM-DD". */
export function fromWib(day: string, time = "08:00"): Date {
  const [y, m, d] = day.split("-").map(Number)
  const [hh, mm] = time.split(":").map(Number)
  return new Date(Date.UTC(y, m - 1, d, hh ?? 8, mm ?? 0) - WIB_OFFSET_MS)
}

/** Jumlah hari sewa: 21 Nov 08.00 → 23 Nov 08.00 dihitung 2 hari. */
export function rentalDays(startsAt: Date, endsAt: Date): number {
  return Math.max(1, Math.round((endsAt.getTime() - startsAt.getTime()) / DAY_MS))
}

export function diffInCalendarDays(startsAt: Date, endsAt: Date): number {
  return dayNumber(endsAt.getTime()) - dayNumber(startsAt.getTime())
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS)
}

export function addWibDays(day: string, days: number): string {
  return toDayKey(addDays(fromWib(day), days))
}

type Token =
  | "EEE" | "EEEE" | "d" | "dd" | "MMM" | "MMMM" | "yyyy" | "HH" | "mm"

/** Format kecil khusus WIB: "EEE, d MMM yyyy", "d MMMM yyyy", "HH:mm", dll. */
export function formatDateId(date: Date, pattern: string): string {
  const p = parts(date)
  const weekdayIndex = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay()
  const map: Record<Token, string> = {
    EEE: WEEKDAYS_SHORT[weekdayIndex],
    EEEE: WEEKDAYS_LONG[weekdayIndex],
    d: String(p.day),
    dd: String(p.day).padStart(2, "0"),
    MMM: MONTHS_SHORT[p.month - 1],
    MMMM: MONTHS_LONG[p.month - 1],
    yyyy: String(p.year),
    HH: String(p.hour).padStart(2, "0"),
    mm: String(p.minute).padStart(2, "0"),
  }
  return pattern.replace(/EEEE|EEE|MMMM|MMM|dd|HH|mm|d|yyyy/g, (token) => map[token as Token])
}

export function formatDateTimeId(date: Date): string {
  return `${formatDateId(date, "EEE, d MMM yyyy")} · ${formatDateId(date, "HH:mm")}`
}

/** Tanggal awal bulan WIB (00.00) sebagai instant. */
export function startOfMonthWib(date: Date): Date {
  const p = parts(date)
  return fromWib(`${p.year}-${String(p.month).padStart(2, "0")}-01`, "00:00")
}

export { MONTHS_LONG as monthsLong, WEEKDAYS_SHORT as weekdaysShort }
