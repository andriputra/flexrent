import { MAX_DOC_BYTES } from "@/lib/upload-limits"

const EDGES = [1800, 1400, 1000]
const QUALITIES = [0.72, 0.55, 0.4]

function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality))
}

/**
 * Foto KTP/SIM dari kamera HP lazimnya 3–6 MB dan tidak akan muat lewat Server Action.
 * Dokumen dikecilkan di browser sebelum dikirim; bila dekoding gagal, berkas asli
 * diteruskan supaya validasi ukuran yang memberi tahu pemakai.
 */
export async function shrinkDoc(file: File, maxBytes = MAX_DOC_BYTES): Promise<File> {
  if (file.size <= maxBytes || !file.type.startsWith("image/")) return file

  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) return file

  try {
    for (const edge of EDGES) {
      const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height))
      const canvas = document.createElement("canvas")
      canvas.width = Math.max(1, Math.round(bitmap.width * scale))
      canvas.height = Math.max(1, Math.round(bitmap.height * scale))
      const ctx = canvas.getContext("2d")
      if (!ctx) continue
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      for (const quality of QUALITIES) {
        const blob = await encode(canvas, quality)
        if (blob && blob.size <= maxBytes) {
          const base = file.name.replace(/\.[^.]+$/, "") || "dokumen"
          return new File([blob], `${base}.jpg`, { type: "image/jpeg", lastModified: file.lastModified })
        }
      }
    }
    return file
  } finally {
    bitmap.close()
  }
}
