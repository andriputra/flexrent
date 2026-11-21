import { verifyDocumentLink } from "@/lib/documents"
import { readPrivateFile } from "@/lib/storage"
import { prisma } from "@/lib/db"
import { getTenantContext } from "@/lib/tenant"

type Params = { params: Promise<{ id: string }> }

/**
 * Melayani dokumen KTP/SIM lewat URL bertanda tangan berumur pendek. Tanda tangan
 * saja tidak cukup: permintaan juga harus datang dari sesi staf di tenant pemilik
 * dokumen, jadi tautan yang bocor ke luar tidak bisa dipakai.
 */
async function serve(request: Request, { params }: Params): Promise<Response> {
  const { id } = await params
  const url = new URL(request.url)
  if (!verifyDocumentLink(id, url.searchParams.get("e") ?? "", url.searchParams.get("s") ?? "")) {
    return new Response("Tautan dokumen tidak valid atau sudah kedaluwarsa.", {
      status: 403,
      headers: { "content-type": "text/plain; charset=utf-8", "x-content-type-options": "nosniff" },
    })
  }

  const context = await getTenantContext()
  if (!context) {
    return new Response("Masuk dulu untuk membuka dokumen pelanggan.", {
      status: 401,
      headers: { "content-type": "text/plain; charset=utf-8", "x-content-type-options": "nosniff" },
    })
  }

  const document = await prisma.document.findFirst({
    where: { id, tenantId: context.tenant.id },
    select: { storageKey: true, fileName: true, mimeType: true },
  })
  if (!document) return new Response("Dokumen tidak ditemukan.", { status: 404 })

  const file = await readPrivateFile(document.storageKey)
  if (!file) return new Response("Berkas dokumen hilang dari penyimpanan.", { status: 404 })

  // Buffer (dev lokal) atau ReadableStream (Vercel Blob); dua-duanya valid sebagai body Response.
  const body = file.body as unknown as BodyInit

  return new Response(body, {
    headers: {
      "content-type": document.mimeType || file.contentType,
      "content-disposition": `inline; filename="${document.fileName.replace(/["\r\n]/g, "_")}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
    },
  })
}

export async function GET(request: Request, context: Params) {
  return serve(request, context)
}

export const dynamic = "force-dynamic"
