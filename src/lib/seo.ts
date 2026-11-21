import type { Metadata } from "next"

export const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

/**
 * Kartu share WhatsApp/Telegram hanya membaca URL absolut, jadi path relatif
 * (mis. logo dari disk saat dev) harus diubah penuh lebih dulu.
 */
export function absoluteUrl(path: string): string {
  return path.startsWith("http") ? path : new URL(path, SITE_URL).toString()
}

/**
 * Kartu share bawaan. Ditulis eksplisit karena `openGraph` dari generateMetadata
 * menggantikan gambar file-based milik root layout untuk rute tersebut.
 */
export const DEFAULT_OG_IMAGE = "/opengraph-image"

/**
 * Gambar dipakai bila tenant punya logo/foto, kalau tidak jatuh ke kartu bawaan.
 */
export function publicMeta({
  title,
  description,
  path,
  image,
}: {
  title: string
  description: string
  path: string
  image?: string | null
}): Metadata {
  const url = absoluteUrl(path)
  const images = [absoluteUrl(image || DEFAULT_OG_IMAGE)]
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", url, title, description, images },
    twitter: { card: "summary_large_image", title, description, images },
  }
}
