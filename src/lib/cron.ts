/**
 * Penjaga route /api/cron/*. Vercel Cron otomatis mengirim header
 * "Authorization: Bearer $CRON_SECRET". Nilai contoh dari .env.example ikut
 * ditolak supaya cron tidak pernah terbuka tanpa secret yang diganti.
 */
export function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret || secret === "replace-me") return false
  return request.headers.get("authorization") === `Bearer ${secret}`
}

export function unauthorizedCron(): Response {
  return Response.json({ ok: false, error: "unauthorized" }, { status: 401 })
}
