import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { AlertTriangle, ArrowLeft, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BookingWizard } from "@/components/public/booking-wizard"
import { Notice } from "@/components/shared/layout-parts"
import { termsList } from "@/lib/terms"
import { issueFormTicket } from "@/lib/form-ticket"
import { getPublicTenant } from "@/lib/tenant-public"
import { getCatalogVehicle } from "@/server/queries/public"

const TIME_PATTERN = /^\d{2}:\d{2}$/
/** Wizard tetap satu baris dengan hero: kolom selebar kartu agar form nyaman dibaca. */
const SHELL = "mx-auto w-full max-w-4xl px-4 sm:px-6"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; vehicleId: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const tenant = await getPublicTenant(slug)
  // Form pemesanan bukan halaman yang layak diindeks.
  return { title: tenant ? `Pesan kendaraan — ${tenant.name}` : "Pesan kendaraan", robots: { index: false, follow: false } }
}

export default async function PublicBookingWizardPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; vehicleId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { slug, vehicleId } = await params
  const tenant = await getPublicTenant(slug)
  if (!tenant) notFound()

  const vehicle = await getCatalogVehicle(tenant.id, vehicleId)
  if (!vehicle) notFound()

  const raw = await searchParams
  const pick = (key: string): string => {
    const value = raw[key]
    return typeof value === "string" ? value : ""
  }
  const ambil = pick("ambil")
  const kembali = pick("kembali")

  return (
    <div>
      <section className="relative isolate overflow-hidden border-b border-border/70 bg-background">
        <div
          aria-hidden
          className="anim-drift pointer-events-none absolute -top-32 -right-24 -z-10 size-[380px] rounded-full bg-accent/12 blur-3xl motion-reduce:animate-none"
        />
        <div
          aria-hidden
          className="anim-drift pointer-events-none absolute -bottom-36 -left-28 -z-10 size-[340px] rounded-full bg-primary/10 blur-3xl motion-reduce:animate-none [--d:-9s]"
        />
        <div
          aria-hidden
          className="bg-grid pointer-events-none absolute inset-0 -z-10 opacity-70 [mask-image:radial-gradient(120%_90%_at_50%_0%,black,transparent_75%)]"
        />
        <div className={SHELL}>
          <div className="anim-fade pt-5">
            <Button asChild variant="ghost" size="sm" className="-ml-2 transition-transform duration-300 hover:-translate-x-0.5 motion-reduce:transition-none">
              <Link href={`/${tenant.slug}/kendaraan/${vehicle.id}${ambil && kembali ? `?ambil=${ambil}&kembali=${kembali}` : ""}`}>
                <ArrowLeft aria-hidden />
                Kembali ke detail kendaraan
              </Link>
            </Button>
          </div>
          <div className="mt-3 space-y-2 pb-14 sm:pb-16">
            <h1 className="anim-rise font-display max-w-[24ch] text-[1.85rem] leading-tight font-bold tracking-tight sm:text-[2.2rem]">
              Pesan {vehicle.brand} {vehicle.model}
            </h1>
            <p className="anim-rise text-sm text-muted-foreground tabular-nums [--d:120ms]">
              {vehicle.year} · {vehicle.plate} · {tenant.name}, {tenant.city}
            </p>
          </div>
        </div>
      </section>

      <div className={`${SHELL} -mt-11 pb-4 sm:-mt-12`}>
        {!tenant.acceptingBookings ? (
          <Notice
            tone="warning"
            icon={<AlertTriangle aria-hidden />}
            className="reveal rounded-2xl bg-card text-sm"
          >
            <p>{tenant.closedMessage ?? "Rental sedang tidak menerima pesanan baru."}</p>
          </Notice>
        ) : (
          <>
            <div className="reveal">
              <BookingWizard
                slug={tenant.slug}
                tenantName={tenant.name}
                vehicle={{
                  id: vehicle.id,
                  name: `${vehicle.brand} ${vehicle.model}`,
                  plate: vehicle.plate,
                  hasDriver: vehicle.hasDriver,
                }}
                terms={termsList(tenant.terms)}
                ticket={issueFormTicket(`${tenant.slug}:${vehicle.id}`)}
                initial={{
                  ambil,
                  kembali,
                  jamAmbil: TIME_PATTERN.test(pick("jamAmbil")) ? pick("jamAmbil") : "09:00",
                  jamKembali: TIME_PATTERN.test(pick("jamKembali")) ? pick("jamKembali") : "09:00",
                  sopir: pick("sopir") === "1",
                }}
              />
            </div>

            <p className="flex items-start gap-2 pt-1 text-xs leading-5 text-muted-foreground">
              <ShieldCheck aria-hidden className="mt-0.5 size-3.5 shrink-0 text-primary" />
              Pesanan dibuat atas nama Anda dan dapat dicek kapan saja memakai kode booking beserta nomor WhatsApp.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
