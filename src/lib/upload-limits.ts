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
