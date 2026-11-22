import Link from "next/link"
import { notFound } from "next/navigation"
import { AlertTriangle, Bike, Clock, MapPin, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WhatsAppFloat } from "@/components/public/whatsapp-float"
import { WhatsAppIcon } from "@/components/public/whatsapp-icon"
import { getPublicTenant, whatsappLink } from "@/lib/tenant-public"
import { dayLabel } from "@/lib/opening-hours"

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
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="page-container flex h-16 items-center justify-between gap-4">
          <Link
            href={`/${tenant.slug}`}
            className="group flex min-w-0 items-center gap-2.5 font-semibold tracking-tight"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_10px_22px_-12px_var(--primary)] transition-transform duration-500 group-hover:-rotate-12 group-hover:scale-105">
              <Bike aria-hidden className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm leading-5 sm:text-base">
                {tenant.name}
              </span>
              <span className="block text-xs leading-4 text-muted-foreground">{tenant.city}</span>
            </span>
          </Link>

          <Button
            asChild
            size="sm"
            className="h-8 shrink-0 rounded-full bg-accent px-3.5 text-accent-foreground shadow-[0_10px_22px_-12px_var(--accent)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent-hover"
          >
            <a
              href={whatsappLink(
                tenant.phone,
                `Halo ${tenant.name}, saya ingin bertanya soal sewa kendaraan.`
              )}
              target="_blank"
              rel="noreferrer"
            >
              <WhatsAppIcon className="size-4" />
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

      <footer className="mt-auto border-t border-border/70 bg-card">
        <div className="page-container grid gap-8 py-10 sm:grid-cols-2">
          <div className="space-y-2.5 text-sm">
            <p className="text-base font-semibold tracking-tight">{tenant.name}</p>
            {tenant.tagline ? <p className="max-w-sm text-muted-foreground">{tenant.tagline}</p> : null}
            {tenant.address ? (
              <p className="flex items-start gap-2">
                <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span>{tenant.address}</span>
              </p>
            ) : null}
            <p className="flex items-center gap-2">
              <Phone aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              <a href={`tel:${tenant.phone}`} className="link-underline font-medium">
                {tenant.phone}
              </a>
            </p>
          </div>

          <div className="space-y-2.5 text-sm">
            <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-muted-foreground/70 uppercase">
              <Clock aria-hidden className="size-3.5" />
              Jam operasional
            </p>
            {tenant.openingHours.length ? (
              <ul className="max-w-xs space-y-1 text-muted-foreground">
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
              <Link
                href={`/${tenant.slug}/booking`}
                className="link-underline font-medium text-foreground"
              >
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
