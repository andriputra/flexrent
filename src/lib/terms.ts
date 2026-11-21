/**
 * Syarat sewa tenant disimpan sebagai satu teks. Baris/karakter bullet dipecah
 * supaya halaman publik bisa menampilkannya sebagai daftar.
 */
const FALLBACK_TERMS = [
  "Fotokopi KTP dan SIM yang masih berlaku ditunjukkan saat serah terima.",
  "Deposit dikembalikan penuh setelah kendaraan kembali dalam kondisi normal.",
  "Keterlambatan pengembalian dikenakan biaya sewa harian ditambah denda.",
  "Kendaraan tidak boleh digunakan untuk balapan, angkutan barang berlebih, atau dialihkan ke pihak lain.",
]

export function termsList(terms: string | null): string[] {
  if (!terms) return FALLBACK_TERMS
  const lines = terms
    .split(/\n+/)
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean)
  return lines.length ? lines : FALLBACK_TERMS
}
