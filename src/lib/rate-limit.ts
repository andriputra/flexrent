import { prisma } from "@/lib/db"

const MINUTE = 60_000

export type RateRule = { limit: number; windowMs: number }

/**
 * Ambang per sisi yang terkena dampak bot/paksa-coba. Angka longgar karena satu
 * jendela dipakai bersama satu alamat IP di belakang NAT (kantor, kampus, seluler).
 */
export const RATE_RULES = {
  booking: { limit: 8, windowMs: 10 * MINUTE },
  documentUpload: { limit: 12, windowMs: 60 * MINUTE },
  login: { limit: 10, windowMs: 5 * MINUTE },
  register: { limit: 5, windowMs: 60 * MINUTE },
  documentFetch: { limit: 60, windowMs: MINUTE },
} satisfies Record<string, RateRule>

export type RateDecision = { allowed: boolean; retryAfterSec: number }

/** Kunci memuat awal jendela, jadi hitungan jendela baru tidak pernah menumpuk. */
function bucketFor(scope: string, identity: string, windowMs: number) {
  const now = Date.now()
  const opensAt = new Date(Math.floor(now / windowMs) * windowMs)
  return { key: `${scope}:${identity}:${opensAt.getTime()}`, opensAt, now }
}

/** Alamat pemanggil; Vercel menaruh daftar proxy di x-forwarded-for. */
export function clientIp(headers: Headers): string {
  const first = headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  return first || headers.get("x-real-ip")?.trim() || "alamat-tak-diketahui"
}

/**
 * Naikkan satu hitungan dan putuskan apakah masih di bawah ambang. Kegagalan DB
 * sengaja diloloskan: penolakan pesanan yang sah lebih mahal daripada sesi limit
 * yang sementara tidak bekerja.
 */
export async function consumeRate(scope: string, identity: string, rule: RateRule): Promise<RateDecision> {
  const { key, opensAt, now } = bucketFor(scope, identity, rule.windowMs)
  try {
    const [row] = await prisma.$queryRaw<{ count: number }[]>`
      WITH bumped AS (
        INSERT INTO "rate_limit_buckets" ("key", "count", "at")
        VALUES (${key}, 1, ${opensAt})
        ON CONFLICT ("key") DO UPDATE SET "count" = "rate_limit_buckets"."count" + 1
        RETURNING "count"
      )
      SELECT "count" FROM bumped
    `
    const count = Number(row?.count ?? 1)
    if (count <= rule.limit) return { allowed: true, retryAfterSec: 0 }
    return { allowed: false, retryAfterSec: Math.ceil((opensAt.getTime() + rule.windowMs - now) / 1000) }
  } catch (error) {
    console.error("[rate-limit] pencacah tidak tersedia", scope, error)
    return { allowed: true, retryAfterSec: 0 }
  }
}

/** Window pembersihan dipisah dari jendela limit agar baris lama tidak menumpuk selamanya. */
export function pruneRateLimits(retentionMs = 24 * 60 * MINUTE) {
  return prisma.rateLimitBucket.deleteMany({ where: { at: { lt: new Date(Date.now() - retentionMs) } } })
}
