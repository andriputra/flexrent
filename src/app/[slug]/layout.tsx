import Link from "next/link"
import { notFound } from "next/navigation"
import { AlertTriangle, Bike, Clock, MapPin, MessageCircle, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WhatsAppFloat } from "@/components/public/whatsapp-float"
import { getPublicTenant, whatsappLink } from "@/lib/tenant-public"

function dayLabel(day: string): string {
  return day.charAt(0).toUpperCase() + day.slice(1)
}

export default async function TenantPublicLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const tenant = await getPublicTenant(slug)
  if (!tenant) notFound()

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="page-container flex h-16 items-center justify-between gap-4">
          <Link href={`/${tenant.slug}`} className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Bike aria-hidden className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm leading-5 font-semibold sm:text-base">
                {tenant.name}
              </span>
              <span className="block text-xs leading-4 text-muted-foreground">{tenant.city}</span>
            </span>
          </Link>

          <Button asChild size="sm" className="shrink-0 bg-accent text-accent-foreground hover:bg-accent-hover">
            <a href={whatsappLink(tenant.phone, `Halo ${tenant.name}, saya ingin bertanya soal sewa kendaraan.`)} target="_blank" rel="noreferrer">
              <MessageCircle aria-hidden />
              WhatsApp
            </a>
          </Button>
        </div>
      </header>

      {!tenant.acceptingBookings ? (
        <div className="border-b bg-warning/10">
          <div className="page-container flex items-start gap-2.5 py-3 text-sm">
            <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
            <p>{tenant.closedMessage}</p>
          </div>
        </div>
      ) : null}

      <main className="flex-1">{children}</main>

      <footer className="mt-auto border-t bg-card">
        <div className="page-container grid gap-6 py-8 sm:grid-cols-2">
          <div className="space-y-2 text-sm">
            <p className="text-base font-semibold">{tenant.name}</p>
            {tenant.tagline ? <p className="max-w-sm text-muted-foreground">{tenant.tagline}</p> : null}
            {tenant.address ? (
              <p className="flex items-start gap-2">
                <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span>{tenant.address}</span>
              </p>
            ) : null}
            <p className="flex items-center gap-2">
              <Phone aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              <a href={`tel:${tenant.phone}`} className="hover:underline">
                {tenant.phone}
              </a>
            </p>
          </div>

          <div className="space-y-2 text-sm">
            <p className="flex items-center gap-2 font-medium">
              <Clock aria-hidden className="size-4 text-muted-foreground" />
              Jam operasional
            </p>
            {tenant.openingHours.length ? (
              <ul className="space-y-1 text-muted-foreground">
                {tenant.openingHours.map((row) => (
                  <li key={row.day} className="flex justify-between gap-4 tabular-nums">
                    <span>{dayLabel(row.day)}</span>
                    <span>{row.closed ? "Tutup" : `${row.open}–${row.close}`}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">
                Jam pengambilan diatur lewat WhatsApp setelah pesanan dibuat.
              </p>
            )}
            <p className="pt-1">
              <Link href={`/${tenant.slug}/booking`} className="font-medium hover:underline">
                Cek status pesanan
              </Link>
            </p>
          </div>
        </div>
      </footer>

      <WhatsAppFloat phone={tenant.phone} name={tenant.name} />
    </div>
  )
}
