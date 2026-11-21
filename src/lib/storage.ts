import { randomUUID } from "node:crypto"
import { mkdir, unlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { put, del, type PutBlobResult } from "@vercel/blob"

export type StoredFile = { url: string; storageKey: string }

const MAX_BYTES = 4 * 1024 * 1024
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

/** Vercel Blob dipakai bila token diisi; tanpa token, dev menyimpan ke /public/uploads. */
const blobToken = process.env.BLOB_READ_WRITE_TOKEN

export class StorageError extends Error {}

function extensionFor(file: File): string {
  const ext = ALLOWED_TYPES[file.type]
  if (!ext) throw new StorageError(`Format gambar tidak didukung: ${file.type || "tidak diketahui"}`)
  return ext
}

function assertSize(file: File) {
  if (file.size > MAX_BYTES) {
    throw new StorageError(`Ukuran foto maksimal ${Math.round(MAX_BYTES / 1024 / 1024)} MB`)
  }
  if (file.size === 0) throw new StorageError("File kosong, pilih foto lain")
}

/** `group` boleh beberapa segmen ("vehicles/slug"); tiap segmen dibersihkan agar aman jadi path. */
function safeName(name: string): string {
  const segments = name
    .split("/")
    .map((segment) => segment.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40))
    .filter(Boolean)
  return segments.length ? segments.join("/") : "misc"
}

export async function uploadImage(file: File, group: string): Promise<StoredFile> {
  assertSize(file)
  const ext = extensionFor(file)
  const folder = safeName(group)
  const key = `${folder}/${randomUUID()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  if (blobToken) {
    const blob = (await put(`flexrent/${key}`, buffer, {
      access: "public",
      addRandomSuffix: false,
      contentType: file.type,
      token: blobToken,
    })) as PutBlobResult
    return { url: blob.url, storageKey: blob.url }
  }

  const fileName = `${randomUUID()}.${ext}`
  const relativeDir = path.join("public", "uploads", folder)
  await mkdir(relativeDir, { recursive: true })
  await writeFile(path.join(relativeDir, fileName), buffer)
  return { url: `/uploads/${folder}/${fileName}`, storageKey: `uploads/${folder}/${fileName}` }
}

export async function deleteImages(items: StoredFile[]): Promise<void> {
  if (blobToken) {
    const urls = items.map((item) => item.storageKey).filter((value) => value.startsWith("http"))
    if (urls.length) await del(urls, { token: blobToken })
    return
  }
  await Promise.all(
    items.map(async (item) => {
      const target = path.resolve("public", item.storageKey)
      // Tolak path di luar folder uploads (mis. ".../.." hasil input rusak).
      if (!target.startsWith(path.resolve("public", "uploads"))) return
      await unlink(target).catch(() => undefined)
    })
  )
}
