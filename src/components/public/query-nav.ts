import type { CatalogQuery } from "@/lib/validators/public"

/** Tautan katalog dari nilai form — filter yang kosong tidak ikut masuk URL. */
export function buildCatalogHref(slug: string, values: Partial<CatalogQuery>): string {
  const params = new URLSearchParams()
  if (values.ambil) params.set("ambil", values.ambil)
  if (values.kembali) params.set("kembali", values.kembali)
  if (values.jenis) params.set("jenis", values.jenis)
  if (values.transmisi) params.set("transmisi", values.transmisi)
  if (values.min) params.set("min", String(values.min))
  if (values.maks) params.set("maks", String(values.maks))
  const query = params.toString()
  return query ? `/${slug}?${query}` : `/${slug}`
}
