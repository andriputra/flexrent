import { verifyDocumentLink } from "@/lib/documents"
import { readPrivateFile } from "@/lib/storage"
import { prisma } from "@/lib/db"
import { getTenantContext } from "@/lib/tenant"
import { clientIp, consumeRate, RATE_RULES } from "@/lib/rate-limit"

type Params = { params: Promise<{ id: string }> }

function textError(message: string, status: number): Response {
  return new Response(message, {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "x-content-type-options": "nosniff",
      ...(status === 429 ? { "retry-after": String(RATE_RULES.documentFetch.windowMs / 1000) } : {}),
    },
  })
}

/**
 * Melayani dokumen KTP/SIM lewat URL bertanda tangan berumur pendek. Tanda tangan
 * saja tidak cukup: permintaan juga harus datang dari sesi staf di tenant pemilik
 * dokumen, jadi tautan yang bocor ke luar tidak bisa dipakai.
 */
async function serve(request: Request, { params }: Params): Promise<Response> {
  const { id } = await params
  const url = new URL(request.url)
  if (!verifyDocumentLink(id, url.searchParams.get("e") ?? "", url.searchParams.get("s") ?? "")) {
    return textError("Tautan dokumen tidak valid atau sudah kedaluwarsa.", 403)
  }

  const context = await getTenantContext()
  if (!context) return textError("Masuk dulu untuk membuka dokumen pelanggan.", 401)

  const throttled = await consumeRate(
    "documentFetch",
    `${clientIp(request.headers)}:${context.user.id}`,
    RATE_RULES.documentFetch
  )
  if (!throttled.allowed) return textError("Terlalu banyak permintaan dokumen. Tunggu sebentar.", 429)

  const document = await prisma.document.findFirst({
    where: { id, tenantId: context.tenant.id },
    select: { storageKey: true, fileName: true, mimeType: true },
  })
  if (!document) return textError("Dokumen tidak ditemukan.", 404)

  const file = await readPrivateFile(document.storageKey)
  if (!file) return textError("Berkas dokumen hilang dari penyimpanan.", 404)

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
