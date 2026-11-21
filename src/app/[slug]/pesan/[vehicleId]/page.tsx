import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { AlertTriangle, ArrowLeft, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BookingWizard } from "@/components/public/booking-wizard"
import { termsList } from "@/lib/terms"
import { issueFormTicket } from "@/lib/form-ticket"
import { getPublicTenant } from "@/lib/tenant-public"
import { getCatalogVehicle } from "@/server/queries/public"

const TIME_PATTERN = /^\d{2}:\d{2}$/

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; vehicleId: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const tenant = await getPublicTenant(slug)
  return { title: tenant ? `Pesan kendaraan — ${tenant.name}` : "Pesan kendaraan" }
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
    <div className="page-container space-y-5 py-6 sm:space-y-6 sm:py-8">
      <div className="space-y-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href={`/${tenant.slug}/kendaraan/${vehicle.id}${ambil && kembali ? `?ambil=${ambil}&kembali=${kembali}` : ""}`}>
            <ArrowLeft aria-hidden />
            Kembali ke detail kendaraan
          </Link>
        </Button>
        <h1 className="text-[1.75rem] leading-9 font-semibold tracking-tight">Pesan {vehicle.brand} {vehicle.model}</h1>
        <p className="text-sm text-muted-foreground tabular-nums">
          {vehicle.year} · {vehicle.plate} · {tenant.name}, {tenant.city}
        </p>
      </div>

      {!tenant.acceptingBookings ? (
        <div className="flex items-start gap-2.5 rounded-2xl border bg-warning/10 p-4 text-sm">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
          <p>{tenant.closedMessage ?? "Rental sedang tidak menerima pesanan baru."}</p>
        </div>
      ) : (
        <>
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

          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
            Pesanan dibuat atas nama Anda dan dapat dicek kapan saja memakai kode booking beserta nomor WhatsApp.
          </p>
        </>
      )}
    </div>
  )
}
