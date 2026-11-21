import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { AlertTriangle, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BookingLookupForm } from "@/components/public/booking-lookup-form"
import { getPublicTenant } from "@/lib/tenant-public"

export const metadata: Metadata = { title: "Cek status pesanan" }

export default async function PublicBookingLookupPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const tenant = await getPublicTenant(slug)
  if (!tenant) notFound()

  return (
    <div className="page-container max-w-xl space-y-5 py-10 sm:py-14">
      <div className="space-y-2">
        <h1 className="text-[1.75rem] leading-9 font-semibold tracking-tight">Cek status pesanan</h1>
        <p className="text-sm text-muted-foreground">
          Masukkan kode booking (contoh BR-2611-0007) dan nomor WhatsApp yang dipakai saat memesan.
        </p>
      </div>

      <BookingLookupForm slug={tenant.slug} />

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
        Pesanan hanya bisa dibuka dengan kode dan nomor WhatsApp pemiliknya, jadi tautan status tidak berguna bila
        diteruskan ke orang lain.
      </p>

      <Button asChild variant="link" className="h-auto p-0 text-sm">
        <Link href={`/${tenant.slug}`}>
          <KeyRound aria-hidden />
          Kembali ke katalog kendaraan
        </Link>
      </Button>
    </div>
  )
}
