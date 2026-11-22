import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { AlertTriangle, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BookingLookupForm } from "@/components/public/booking-lookup-form"
import { getPublicTenant } from "@/lib/tenant-public"

export const metadata: Metadata = { title: "Cek status pesanan" }

const SHELL = "mx-auto w-full max-w-xl px-4 sm:px-6"

export default async function PublicBookingLookupPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const tenant = await getPublicTenant(slug)
  if (!tenant) notFound()

  return (
    <div>
      <section className="relative isolate overflow-hidden border-b border-border/70 bg-background">
        <div
          aria-hidden
          className="anim-drift pointer-events-none absolute -top-32 -right-24 -z-10 size-[360px] rounded-full bg-accent/12 blur-3xl motion-reduce:animate-none"
        />
        <div
          aria-hidden
          className="anim-drift pointer-events-none absolute -bottom-32 -left-28 -z-10 size-[320px] rounded-full bg-primary/10 blur-3xl motion-reduce:animate-none [--d:-9s]"
        />
        <div
          aria-hidden
          className="bg-grid pointer-events-none absolute inset-0 -z-10 opacity-70 [mask-image:radial-gradient(120%_90%_at_50%_0%,black,transparent_75%)]"
        />
        <div className={`${SHELL} pb-14 pt-10 sm:pb-16 sm:pt-12`}>
          <span className="anim-pop mb-3 flex size-11 items-center justify-center rounded-2xl border border-border/70 bg-card text-primary shadow-card">
            <KeyRound aria-hidden className="size-5" />
          </span>
          <h1 className="anim-rise font-display text-[1.85rem] leading-tight font-bold tracking-tight sm:text-[2.2rem]">
            Cek status pesanan
          </h1>
          <p className="anim-rise mt-2 text-sm leading-6 text-muted-foreground [--d:120ms]">
            Masukkan kode booking (contoh BR-2611-0007) dan nomor WhatsApp yang dipakai saat memesan.
          </p>
        </div>
      </section>

      <div className={`${SHELL} -mt-11 pb-6 sm:-mt-12`}>
        <BookingLookupForm slug={tenant.slug} />

        <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
          <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0 text-warning" />
          Pesanan hanya bisa dibuka dengan kode dan nomor WhatsApp pemiliknya, jadi tautan status tidak berguna bila
          diteruskan ke orang lain.
        </p>

        <Button asChild variant="link" className="mt-3 h-auto justify-start p-0 text-sm">
          <Link href={`/${tenant.slug}`} className="link-underline">
            <KeyRound aria-hidden />
            Kembali ke katalog kendaraan
          </Link>
        </Button>
      </div>
    </div>
  )
}
