/**
 * CSV untuk ekspor laporan. Nilai teks dibungkus tanda kutip kalau mengandung
 * pemisah, kutip, atau baris baru — pola yang dipakai Excel dan Google Sheets.
 */

const SEPARATOR = ","
const BOM = "\uFEFF"

function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ""
  const text = String(value)
  if (!/[",\n\r]/.test(text)) return text
  return `"${text.replace(/"/g, '""')}"`
}

export function csvRow(values: (string | number | null | undefined)[]): string {
  return values.map(escapeCell).join(SEPARATOR)
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  // BOM dipakai supaya Excel membuka file sebagai UTF-8, bukan Windows-1252.
  return `${BOM}${rows.map(csvRow).join("\r\n")}\r\n`
}

/** "Nama file" dengan karakter aman untuk header Content-Disposition. */
export function csvFilename(base: string): string {
  const safe = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return `${safe || "laporan"}.csv`
}
