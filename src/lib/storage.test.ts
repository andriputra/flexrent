import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ mkdir: vi.fn(), writeFile: vi.fn() }))

vi.mock("node:fs/promises", () => ({
  mkdir: (target: string) => mocks.mkdir(target),
  writeFile: (target: string, data: unknown) => mocks.writeFile(target, data),
  readFile: vi.fn(),
  unlink: vi.fn(),
}))
vi.mock("@vercel/blob", () => ({ put: vi.fn(), get: vi.fn(), del: vi.fn() }))

const { StorageError, uploadImage, uploadPrivateFile } = await import("./storage")

function png(name = "foto.png") {
  return new File([new Uint8Array([137, 80, 78, 71])], name, { type: "image/png" })
}

beforeEach(() => {
  mocks.mkdir.mockReset()
  mocks.writeFile.mockReset()
})

describe("tanpa Blob store (token tidak diisi)", () => {
  it("membungkus kegagalan disk jadi pesan yang menyebutkan Blob store", async () => {
    mocks.mkdir.mockRejectedValue(Object.assign(new Error("ENOENT: no such file or directory, mkdir 'public'"), { code: "ENOENT" }))

    const error = await uploadImage(png(), "vehicles/bandung-ride").catch((e) => e)
    expect(error).toBeInstanceOf(StorageError)
    expect(error.message).toContain("Penyimpanan berkas belum tersedia")
    expect(error.message).toContain("BLOB_READ_WRITE_TOKEN")
    expect(error.message).toContain("mkdir 'public'")
    expect(mocks.writeFile).not.toHaveBeenCalled()
  })

  it("berlaku sama untuk dokumen KTP/SIM", async () => {
    mocks.mkdir.mockRejectedValue(new Error("EROFS: read-only file system, mkdir 'private'"))

    const error = await uploadPrivateFile(png("ktp.png"), "documents/bandung-ride").catch((e) => e)
    expect(error).toBeInstanceOf(StorageError)
    expect(error.message).toContain("EROFS")
  })

  it("tetap menulis ke disk bila foldernya bisa dibuat", async () => {
    mocks.mkdir.mockResolvedValue(undefined)
    mocks.writeFile.mockResolvedValue(undefined)

    const saved = await uploadImage(png(), "vehicles/bandung-ride")
    expect(saved.url).toMatch(/^\/uploads\/vehicles\/bandung-ride\/[0-9a-f-]+\.png$/)
    expect(mocks.writeFile).toHaveBeenCalled()
  })
})
