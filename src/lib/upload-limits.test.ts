import { describe, expect, it } from "vitest"
import nextConfig from "../../next.config"
import {
  ACTION_BODY_LIMIT_BYTES,
  MAX_DOC_BYTES,
  MAX_IMAGE_BYTES,
  UPLOAD_BODY_BUDGET_BYTES,
  perFileBudget,
  uploadBudgetError,
} from "@/lib/upload-limits"

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

  it("menyisakan ruang untuk field teks di atas bagian berkas", () => {
    expect(UPLOAD_BODY_BUDGET_BYTES).toBeLessThan(ACTION_BODY_LIMIT_BYTES)
  })
})

describe("jatah per berkas untuk batch foto admin", () => {
  it("batch penuh tidak pernah melewati jatah total", () => {
    // 6 foto = MAX_VEHICLE_PHOTOS, 8 = MAX_HANDOVER_PHOTOS.
    for (const count of [1, 2, 3, 6, 8, 12]) {
      expect(perFileBudget(count) * count).toBeLessThanOrEqual(UPLOAD_BODY_BUDGET_BYTES)
      expect(perFileBudget(count)).toBeLessThanOrEqual(MAX_IMAGE_BYTES)
    }
  })

  it("jatah masih cukup untuk foto yang bisa dibaca", () => {
    // Di bawah ~300 KB hasil kompresi mulai tampak seperti coretan.
    expect(perFileBudget(8)).toBeGreaterThanOrEqual(300 * 1024)
    expect(perFileBudget(1)).toBe(MAX_IMAGE_BYTES)
  })

  it("menolak batch yang masih terlalu besar setelah kompresi", () => {
    const mb = 1024 * 1024
    expect(uploadBudgetError([{ size: mb }, { size: mb }])).toBeNull()
    expect(uploadBudgetError([])).toBeNull()
    expect(uploadBudgetError([{ size: 2 * mb }, { size: 2 * mb }])).toMatch(/melebihi jatah/)
  })
})

