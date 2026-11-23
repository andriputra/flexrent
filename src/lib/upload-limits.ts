const MB = 1024 * 1024

/**
 * Berkas ikut terkirim di dalam request Server Action, jadi batas sebenarnya adalah
 * plafon body (lihat `next.config.ts`). Permintaan di atas plafon ditolak framework
 * sebelum kode kita jalan, dan yang muncul di layar pemakai cuma halaman error.
 */
export const ACTION_BODY_LIMIT_BYTES = 4 * MB

/** Satu pesanan membawa KTP dan SIM pada request yang sama, jadi tiap berkas diberi jatah. */
export const MAX_DOC_BYTES = Math.round(1.5 * MB)
export const MAX_DOC_LABEL = "1,5 MB"

export const DOC_HINT = `JPG, PNG, WebP, atau PDF maksimal ${MAX_DOC_LABEL}`

/**
 * Jatah total bagian berkas dalam satu request. Sisanya (~1 MB) untuk field teks,
 * tiket form, dan overhead multipart supaya request tidak pernah menyentuh plafon
 * framework — di atas itu yang tampil cuma halaman error, bukan pesan kita.
 */
export const UPLOAD_BODY_BUDGET_BYTES = 3 * MB

/** Foto tunggal: sama ketatnya dengan dokumen, dan tetap jauh di bawah jatah total. */
export const MAX_IMAGE_BYTES = MAX_DOC_BYTES
export const MAX_IMAGE_LABEL = MAX_DOC_LABEL

/**
 * Plafon per berkas untuk satu batch. Enam foto sekaligus harus tetap muat, jadi
 * jatah tiap berkas dikecilkan seiring banyaknya berkas, tidak pernah di atas
 * plafon satu berkas.
 */
export function perFileBudget(count: number): number {
  if (count <= 1) return MAX_IMAGE_BYTES
  return Math.min(MAX_IMAGE_BYTES, Math.floor(UPLOAD_BODY_BUDGET_BYTES / count))
}

/** Ukuran dalam gaya Indonesia: KB untuk berkas kecil, koma desimal untuk MB. */
export function formatBytes(value: number): string {
  if (value < MB) return `${Math.max(1, Math.round(value / 1024))} KB`
  return `${(value / MB).toFixed(1).replace(".", ",")} MB`
}

/** Penjaga terakhir: batch yang tetap terlalu besar setelah kompresi di klien. */
export function uploadBudgetError(files: { size: number }[]): string | null {
  const total = files.reduce((sum, file) => sum + file.size, 0)
  if (total <= UPLOAD_BODY_BUDGET_BYTES) return null
  return `Total berkas foto ${formatBytes(total)} melebihi jatah ${formatBytes(UPLOAD_BODY_BUDGET_BYTES)} dalam satu kali unggah — unggah lebih sedikit sekaligus.`
}
