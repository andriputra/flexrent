const rupiahFormatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 })

/** 150000 -> "Rp 150.000" */
export function formatRupiah(value: number): string {
  return `Rp ${rupiahFormatter.format(Math.round(value || 0))}`
}

/** "Rp 150.000" | "150.000" | "150000" -> 150000. null bila tidak valid. */
export function parseRupiah(value: string): number | null {
  const digits = value.replace(/[^\d]/g, "")
  if (!digits) return null
  const parsed = Number(digits)
  return Number.isSafeInteger(parsed) ? parsed : null
}

/** 2500000 -> "2,5 jt" untuk kartu statistik. */
export function formatRupiahShort(value: number): string {
  if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1).replace(".", ",")} M`
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1).replace(".", ",")} jt`
  if (value >= 1_000) return `Rp ${(value / 1_000).toFixed(0)} rb`
  return formatRupiah(value)
}

export function formatNumber(value: number): string {
  return rupiahFormatter.format(Math.round(value || 0))
}

export function formatPercent(value: number, digits = 0): string {
  return `${value.toFixed(digits).replace(".", ",")}%`
}

/** 081234567890 -> "0812-3456-7890" untuk tampilan; simpan tetap apa adanya. */
export function formatPhone(value: string): string {
  return value
}

export function normalizePhone(value: string): string {
  let digits = value.replace(/\D/g, "")
  if (digits.startsWith("62")) digits = `0${digits.slice(2)}`
  if (digits.startsWith("8")) digits = `0${digits}`
  return digits
}

export function initials(name?: string | null): string {
  if (!name) return "?"
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}
