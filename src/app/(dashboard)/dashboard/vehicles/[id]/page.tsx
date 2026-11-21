import Link from "next/link"
import { notFound } from "next/navigation"
import { CalendarDays, ChevronLeft, Image as ImageIcon, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/layout-parts"
import { VehicleStatusBadge, VehicleTypeBadge } from "@/components/shared/status-badge"
import { VehicleForm } from "@/components/vehicles/vehicle-form"
import { VehiclePhotoManager } from "@/components/vehicles/vehicle-photo-manager"
import { VehicleAvailabilityCalendar } from "@/components/vehicles/availability-calendar"
import { MaintenanceRowActions } from "@/components/maintenance/maintenance-row-actions"
import { requireTenant } from "@/lib/tenant"
import { addDays, formatDateTimeId } from "@/lib/datetime"
import { getVehicle, getVehicleCalendar } from "@/server/queries/vehicles"

export const metadata = { title: "Detail kendaraan — Flexrent" }

export default async function VehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireTenant()
  const { id } = await params
  const vehicle = await getVehicle(context.tenant.id, id)
  if (!vehicle) notFound()

  const now = new Date()
  const intervals = await getVehicleCalendar(
    context.tenant.id,
    vehicle.id,
    addDays(now, -30),
    addDays(now, 150)
  )

  const name = `${vehicle.brand} ${vehicle.model}`

  return (
    <>
      <PageHeader
        title={name}
        description={
          <>
            <span className="font-mono tracking-wider">{vehicle.plate}</span>
            <span className="mx-2 text-muted-foreground">·</span>
            <VehicleTypeBadge type={vehicle.type} />
            <span className="ml-2 inline-flex align-middle">
              <VehicleStatusBadge status={vehicle.status} />
            </span>
            {vehicle.isPublished ? null : (
              <span className="ml-2 text-muted-foreground">disembunyikan dari halaman publik</span>
            )}
          </>
        }
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/vehicles">
              <ChevronLeft aria-hidden />
              Kembali ke armada
            </Link>
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="shadow-card lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Data kendaraan</CardTitle>
            <CardDescription>
              Perubahan tarif dan status langsung terlihat di halaman publik tenant Anda.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VehicleForm
              vehicleId={vehicle.id}
              readOnly={context.isReadOnly}
              initialValues={{
                plate: vehicle.plate,
                brand: vehicle.brand,
                model: vehicle.model,
                year: String(vehicle.year),
                color: vehicle.color ?? "",
                type: vehicle.type,
                transmission: vehicle.transmission,
                fuelType: vehicle.fuelType,
                engineCc: vehicle.engineCc ? String(vehicle.engineCc) : "",
                seats: vehicle.seats ? String(vehicle.seats) : "",
                hasDriver: vehicle.hasDriver,
                driverFee: vehicle.driverFee ? String(vehicle.driverFee) : "",
                priceDaily: String(vehicle.priceDaily),
                priceWeekly: vehicle.priceWeekly ? String(vehicle.priceWeekly) : "",
                priceMonthly: vehicle.priceMonthly ? String(vehicle.priceMonthly) : "",
                deposit: vehicle.deposit ? String(vehicle.deposit) : "",
                lateFeeDaily: vehicle.lateFeeDaily ? String(vehicle.lateFeeDaily) : "",
                odometer: vehicle.odometer ? String(vehicle.odometer) : "",
                status: vehicle.status,
                description: vehicle.description ?? "",
                isPublished: vehicle.isPublished,
              }}
            />
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ImageIcon aria-hidden className="size-4 text-muted-foreground" />
                Foto armada
              </CardTitle>
              <CardDescription>Atur urutan dan pilih foto utama.</CardDescription>
            </CardHeader>
            <CardContent>
              <VehiclePhotoManager
                vehicleId={vehicle.id}
                photos={vehicle.photos}
                readOnly={context.isReadOnly}
              />
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Wrench aria-hidden className="size-4 text-muted-foreground" />
                Jadwal perawatan
              </CardTitle>
              <CardDescription>
                {vehicle.maintenancePlans.length === 0
                  ? "Belum ada jadwal terbuka."
                  : `${vehicle.maintenancePlans.length} jadwal belum selesai.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {vehicle.maintenancePlans.map((plan) => (
                <div key={plan.id} className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate text-sm font-medium">{plan.title}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {formatDateTimeId(plan.startsAt)} → {formatDateTimeId(plan.endsAt)}
                    </p>
                    {plan.notes ? (
                      <p className="line-clamp-2 text-xs text-muted-foreground">{plan.notes}</p>
                    ) : null}
                  </div>
                  <MaintenanceRowActions
                    plan={{ id: plan.id, title: plan.title, isDone: plan.isDone }}
                    readOnly={context.isReadOnly}
                    canDelete={context.canManage}
                  />
                </div>
              ))}
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href={`/dashboard/maintenance?vehicle=${vehicle.id}`}>
                  <Wrench aria-hidden />
                  Jadwal perawatan baru
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-card lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays aria-hidden className="size-4 text-muted-foreground" />
              Ketersediaan
            </CardTitle>
            <CardDescription>
              Rentang yang sudah dipesan atau sedang diperbaiki — blokir ini yang membuat pesanan bentrok
              ditolak.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VehicleAvailabilityCalendar intervals={intervals} today={now} />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
