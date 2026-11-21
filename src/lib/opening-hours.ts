/**
 * Jam operasional disimpan di `Tenant.openingHours` sebagai JSON:
 * `[{ day: "senin", open: "08:00", close: "17:00", closed: false }]`.
 * Halaman publik dan halaman pengaturan berbagi parser yang sama supaya bentuk
 * datanya tidak pernah dua versi.
 */

export type OpeningHour = { day: string; open: string; close: string; closed: boolean }

export const WEEK_DAYS = ["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"] as const

export type WeekDay = (typeof WEEK_DAYS)[number]

const DAY_LABELS: Record<WeekDay, string> = {
  senin: "Senin",
  selasa: "Selasa",
  rabu: "Rabu",
  kamis: "Kamis",
  jumat: "Jumat",
  sabtu: "Sabtu",
  minggu: "Minggu",
}

export function dayLabel(day: string): string {
  return DAY_LABELS[day as WeekDay] ?? day.charAt(0).toUpperCase() + day.slice(1)
}

/** Nilai awal editor kalau rental belum pernah mengisi jam operasional. */
export function defaultOpeningHours(): OpeningHour[] {
  return WEEK_DAYS.map((day) => ({ day, open: "08:00", close: "17:00", closed: false }))
}

const TIME = /^\d{2}:\d{2}$/

/**
 * Baris tersimpan dinormalisasi: hari yang tidak dikenal dibuang, urutan mengikuti
 * kalender, dan satu hari hanya boleh muncul sekali. Hasil `[]` berarti rental belum
 * mengatur jam, dan halaman publik menampilkan pesan fallback.
 */
export function parseOpeningHours(value: unknown): OpeningHour[] {
  if (!Array.isArray(value)) return []

  const byDay = new Map<string, OpeningHour>()
  for (const item of value) {
    if (!item || typeof item !== "object") continue
    const row = item as Partial<OpeningHour>
    if (typeof row.day !== "string" || !WEEK_DAYS.includes(row.day as WeekDay)) continue
    if (byDay.has(row.day)) continue
    if (typeof row.open !== "string" || typeof row.close !== "string") continue
    if (!TIME.test(row.open) || !TIME.test(row.close)) continue
    byDay.set(row.day, { day: row.day, open: row.open, close: row.close, closed: row.closed === true })
  }

  return WEEK_DAYS.filter((day) => byDay.has(day)).map((day) => byDay.get(day) as OpeningHour)
}
