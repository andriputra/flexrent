import { randomUUID } from "node:crypto"
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { del, get, put, type PutBlobResult } from "@vercel/blob"

export type StoredFile = { url: string; storageKey: string }

const MAX_BYTES = 4 * 1024 * 1024
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

/** Dokumen pelanggan (KTP/SIM) lebih besar dan tidak boleh berada di folder public. */
const MAX_DOC_BYTES = 5 * 1024 * 1024
const DOC_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
}
const EXT_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
}
const PRIVATE_DIR = path.join("private", "uploads")

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

export type StoredPrivateFile = {
  storageKey: string
  fileName: string
  mimeType: string
  sizeBytes: number
}

/**
 * KTP/SIM. Dengan Vercel Blob objek disimpan `access: "private"` sehingga URL-nya
 * tidak bisa dibuka orang luar; tanpa token, file masuk ke `private/uploads`
 * (di luar `public`, ikut di-gitignore) dan hanya dibaca lewat route handler.
 */
export async function uploadPrivateFile(file: File, group: string): Promise<StoredPrivateFile> {
  if (!DOC_TYPES[file.type]) {
    throw new StorageError(`Format dokumen tidak didukung: ${file.type || "tidak diketahui"}`)
  }
  if (file.size > MAX_DOC_BYTES) {
    throw new StorageError(`Ukuran dokumen maksimal ${Math.round(MAX_DOC_BYTES / 1024 / 1024)} MB`)
  }
  if (file.size === 0) throw new StorageError("File kosong, unggah ulang dokumennya")

  const ext = DOC_TYPES[file.type]
  const folder = safeName(group)
  const fileNameBase = `${randomUUID()}.${ext}`
  const key = `${folder}/${fileNameBase}`
  const buffer = Buffer.from(await file.arrayBuffer())
  const originalName = file.name.slice(0, 120) || `dokumen.${ext}`

  if (blobToken) {
    const blob = (await put(`flexrent-private/${key}`, buffer, {
      access: "private",
      addRandomSuffix: false,
      contentType: file.type,
      token: blobToken,
    })) as PutBlobResult
    return { storageKey: blob.pathname, fileName: originalName, mimeType: file.type, sizeBytes: file.size }
  }

  const relativeDir = path.join(PRIVATE_DIR, folder)
  await mkdir(relativeDir, { recursive: true })
  await writeFile(path.join(relativeDir, fileNameBase), buffer)
  return { storageKey: key, fileName: originalName, mimeType: file.type, sizeBytes: file.size }
}

function mimeFor(storageKey: string): string {
  return EXT_MIME[storageKey.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream"
}

/** Isi dokumen privat untuk ditampilkan ke staf. `null` bila key tidak dikenal. */
export async function readPrivateFile(
  storageKey: string
): Promise<{ body: ReadableStream<Uint8Array> | Buffer; contentType: string } | null> {
  if (blobToken) {
    if (!storageKey || storageKey.startsWith("http")) return null
    try {
      const result = await get(storageKey, { access: "private", token: blobToken })
      if (!result?.stream) return null
      return {
        body: result.stream,
        contentType: result.blob.contentType || mimeFor(storageKey),
      }
    } catch {
      return null
    }
  }

  const target = path.resolve(PRIVATE_DIR, storageKey)
  if (!target.startsWith(path.resolve(PRIVATE_DIR))) return null
  try {
    return { body: await readFile(target), contentType: mimeFor(storageKey) }
  } catch {
    return null
  }
}

export async function deletePrivateFiles(keys: string[]): Promise<void> {
  if (keys.length === 0) return
  if (blobToken) {
    const pathnames = keys.filter((key) => key && !key.startsWith("http"))
    const blobUrls = keys.filter((key) => key.startsWith("http"))
    if (blobUrls.length) await del(blobUrls, { token: blobToken }).catch(() => undefined)
    if (pathnames.length) await del(pathnames, { token: blobToken }).catch(() => undefined)
    return
  }
  await Promise.all(
    keys.map(async (key) => {
      const target = path.resolve(PRIVATE_DIR, key)
      if (!target.startsWith(path.resolve(PRIVATE_DIR))) return
      await unlink(target).catch(() => undefined)
    })
  )
}
