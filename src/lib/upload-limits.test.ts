import { describe, expect, it } from "vitest"
import nextConfig from "../../next.config"
import { ACTION_BODY_LIMIT_BYTES, MAX_DOC_BYTES } from "@/lib/upload-limits"

describe("plafon berkas Server Action", () => {
  it("menyamakan batas framework dengan batas yang dipakai antarmuka", () => {
    expect(nextConfig.experimental?.serverActions?.bodySizeLimit).toBe("4mb")
    expect(ACTION_BODY_LIMIT_BYTES).toBe(4 * 1024 * 1024)
  })

  it("memuat dua dokumen sekaligus di bawah plafon request", () => {
    // Permintaan yang melewati plafon ditolak sebelum createBookingAction jalan,
    // dan pemakai cuma melihat halaman error tanpa penjelasan.
    expect(MAX_DOC_BYTES * 2).toBeLessThan(ACTION_BODY_LIMIT_BYTES)
  })
})
