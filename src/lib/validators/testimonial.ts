import { z } from "zod"
import { boolField, dayField, intField } from "./common"

export const TESTIMONIAL_AUTHOR_MIN = 2
export const TESTIMONIAL_AUTHOR_MAX = 60
export const TESTIMONIAL_MESSAGE_MIN = 10
export const TESTIMONIAL_MESSAGE_MAX = 500

const authorField = z
  .string()
  .trim()
  .min(TESTIMONIAL_AUTHOR_MIN, `Nama minimal ${TESTIMONIAL_AUTHOR_MIN} karakter`)
  .max(TESTIMONIAL_AUTHOR_MAX, `Nama maksimal ${TESTIMONIAL_AUTHOR_MAX} karakter`)

const messageField = z
  .string()
  .trim()
  .min(TESTIMONIAL_MESSAGE_MIN, `Ulasan minimal ${TESTIMONIAL_MESSAGE_MIN} karakter`)
  .max(TESTIMONIAL_MESSAGE_MAX, `Ulasan maksimal ${TESTIMONIAL_MESSAGE_MAX} karakter`)

const ratingField = intField("Rating", { min: 1, max: 5 })

/** Pilihan kendaraan boleh kosong; "ALL" datang dari dropdown filter yang tidak ikut tersimpan. */
const vehicleField = z
  .union([z.string(), z.undefined(), z.null()])
  .transform((value) => {
    const text = String(value ?? "").trim()
    return text && text !== "ALL" ? text : null
  })

const idField = z
  .union([z.string(), z.undefined(), z.null()])
  .transform((value) => String(value ?? "").trim() || null)

/** Masukan staf lewat dasbor: boleh memilih kendaraan, tanggal, dan status terbit. */
export const testimonialInput = z.object({
  id: idField,
  vehicleId: vehicleField,
  author: authorField,
  rating: ratingField,
  message: messageField,
  occurredDay: dayField("Tanggal ulasan"),
  published: boolField,
})

export type TestimonialInput = z.infer<typeof testimonialInput>

/**
 * Masukan anonim lewat halaman publik. Sengaja tidak memuat tanggal maupun status:
 * keduanya ditentukan server agar pengirim tidak bisa menandai ulasannya sendiri
 * sebagai terbit. Medan jebakan dan pembatasan laju ditangani `spamRejection`
 * sebelum payload ini dibaca, jadi tidak ikut divalidasi di sini.
 */
export const testimonialPublicInput = z.object({
  vehicleId: vehicleField,
  author: authorField,
  rating: ratingField,
  message: messageField,
})

export type TestimonialPublicInput = z.infer<typeof testimonialPublicInput>

export const testimonialFieldLabels: Record<string, string> = {
  id: "Testimoni",
  vehicleId: "Kendaraan",
  author: "Nama",
  rating: "Rating",
  message: "Ulasan",
  occurredDay: "Tanggal ulasan",
  published: "Status",
}
