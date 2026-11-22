import Link from "next/link"
import { CalendarClock, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EmptyState, PageHeader } from "@/components/shared/layout-parts"
import { MaintenanceFilterBar } from "@/components/maintenance/maintenance-filter-bar"
import { MaintenanceRowActions } from "@/components/maintenance/maintenance-row-actions"
import { NewMaintenanceDialog } from "@/components/maintenance/new-maintenance-dialog"
import { requireTenant } from "@/lib/tenant"
import { formatDateTimeId, diffInCalendarDays } from "@/lib/datetime"
import { listMaintenancePlans, getVehicleOptions } from "@/server/queries/maintenance"

export const metadata = { title: "Perawatan" }

type SearchParams = { vehicle?: string; selesai?: string; page?: string }

function SlotRange({ startsAt, endsAt }: { startsAt: Date; endsAt: Date }) {
  const days = diffInCalendarDays(startsAt, endsAt)
  const span =
    days === 0
      ? `${Math.max(1, Math.round((endsAt.getTime() - startsAt.getTime()) / 3_600_000))} jam`
      : `${days + 1} hari`
  return (
    <div className="text-sm leading-5 tabular-nums">
      <p>{formatDateTimeId(startsAt)}</p>
      <p className="text-xs text-muted-foreground">
        s/d {formatDateTimeId(endsAt)} · {span}
      </p>
    </div>
  )
}

export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const context = await requireTenant()
  const params = await searchParams

  const requestedVehicle = params.vehicle || undefined
  const isDone = params.selesai === "DONE" ? true : params.selesai === "OPEN" ? false : undefined
  const listFilters = {
    isDone,
    page: Math.max(1, Number(params.page ?? 1) || 1),
  }

  const [vehicles, filtered] = await Promise.all([
    getVehicleOptions(context.tenant.id),
    listMaintenancePlans(context.tenant.id, { ...listFilters, vehicleId: requestedVehicle }),
  ])
  const vehicleIds = new Set(vehicles.map((vehicle) => vehicle.id))
  const activeVehicle = requestedVehicle && vehicleIds.has(requestedVehicle) ? requestedVehicle : undefined

  const pageHref = (target: number) => {
    const query = new URLSearchParams()
    if (params.vehicle) query.set("vehicle", params.vehicle)
    if (params.selesai) query.set("selesai", params.selesai)
    if (target > 1) query.set("page", String(target))
    const suffix = query.toString()
    return `/dashboard/maintenance${suffix ? `?${suffix}` : ""}`
  }

  // Filter kendaraan asing menghasilkan nol baris, jadi daftar diambil ulang tanpa filter.
  const { rows, total, open, page, totalPages } =
    activeVehicle || !requestedVehicle
      ? filtered
      : await listMaintenancePlans(context.tenant.id, listFilters)

  const options = vehicles.map((vehicle) => ({
    id: vehicle.id,
    label: `${vehicle.brand} ${vehicle.model} · ${vehicle.plate}`,
  }))

  return (
    <>
      <PageHeader
        title="Perawatan"
        description="Jadwalkan servis dan catat pekerjaan bengkel. Slot perawatan memblokir pemesanan dan mengubah status kendaraan menjadi Perawatan."
        actions={
          <NewMaintenanceDialog
            vehicles={options}
            defaultVehicleId={activeVehicle}
            readOnly={context.isReadOnly}
          />
        }
      />

      <MaintenanceFilterBar vehicles={options} total={total} open={open} />

      {rows.length === 0 ? (
        <EmptyState
          icon={<CalendarClock aria-hidden />}
          title={total === 0 ? "Belum ada jadwal perawatan" : "Tidak ada jadwal yang cocok"}
          description={
            total === 0
              ? "Catat servis rutin di sini agar armada tidak kebetulan dipesan saat sedang di bengkel."
              : "Ubah filter kendaraan atau status untuk melihat jadwal lain."
          }
          action={
            context.isReadOnly ? null : (
              <Button
                className="bg-accent text-accent-foreground hover:bg-accent-hover"
                asChild
              >
                <Link href="/dashboard/vehicles">
                  <Plus aria-hidden />
                  Butuh kendaraan baru?
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border bg-card shadow-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Kendaraan</TableHead>
                  <TableHead className="w-[300px]">Jadwal</TableHead>
                  <TableHead className="w-[240px]">Rentang waktu</TableHead>
                  <TableHead className="w-[130px]">Status</TableHead>
                  <TableHead className="w-[56px] text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="py-2.5">
                      <Link
                        href={`/dashboard/vehicles/${plan.vehicle.id}`}
                        className="inline-block max-w-[226px] truncate align-bottom text-sm font-medium hover:underline"
                      >
                        {plan.vehicle.brand} {plan.vehicle.model}
                      </Link>
                      <p className="font-mono text-xs tracking-wider text-muted-foreground">
                        {plan.vehicle.plate}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="max-w-[276px] truncate text-sm font-medium">{plan.title}</p>
                      {plan.notes ? (
                        <p className="max-w-[276px] truncate text-xs text-muted-foreground">
                          {plan.notes}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <SlotRange startsAt={plan.startsAt} endsAt={plan.endsAt} />
                    </TableCell>
                    <TableCell>
                      <MaintenanceStatus plan={plan} />
                    </TableCell>
                    <TableCell className="text-right">
                      <MaintenanceRowActions
                        plan={plan}
                        readOnly={context.isReadOnly}
                        canDelete={context.canManage}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="space-y-3 md:hidden">
            {rows.map((plan) => (
              <li key={plan.id}>
                <Card className="shadow-card">
                  <CardContent className="space-y-2 px-4 py-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-0.5">
                        <Link
                          href={`/dashboard/vehicles/${plan.vehicle.id}`}
                          className="text-sm font-semibold hover:underline"
                        >
                          {plan.vehicle.brand} {plan.vehicle.model}
                        </Link>
                        <p className="font-mono text-xs tracking-wider text-muted-foreground">
                          {plan.vehicle.plate}
                        </p>
                      </div>
                      <MaintenanceRowActions
                        plan={plan}
                        readOnly={context.isReadOnly}
                        canDelete={context.canManage}
                      />
                    </div>
                    <p className="text-sm font-medium">{plan.title}</p>
                    <SlotRange startsAt={plan.startsAt} endsAt={plan.endsAt} />
                    {plan.notes ? (
                      <p className="text-xs text-muted-foreground">{plan.notes}</p>
                    ) : null}
                    <MaintenanceStatus plan={plan} />
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>

          {totalPages > 1 ? (
            <nav aria-label="Navigasi halaman" className="flex items-center justify-between pt-1">
              <p className="text-sm text-muted-foreground">
                Halaman {page} dari {totalPages}
              </p>
              <div className="flex gap-2">
                {page > 1 ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={pageHref(page - 1)}>Sebelumnya</Link>
                  </Button>
                ) : null}
                {page < totalPages ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={pageHref(page + 1)}>Berikutnya</Link>
                  </Button>
                ) : null}
              </div>
            </nav>
          ) : null}
        </>
      )}
    </>
  )
}

function MaintenanceStatus({ plan }: { plan: { isDone: boolean; startsAt: Date; endsAt: Date } }) {
  if (plan.isDone) {
    return <Badge variant="secondary" className="border-transparent bg-success/12 text-success">Selesai</Badge>
  }
  const now = Date.now()
  if (plan.startsAt.getTime() <= now && plan.endsAt.getTime() > now) {
    return (
      <Badge variant="secondary" className="border-transparent bg-warning/15 text-warning">
        Berlangsung
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="border-transparent bg-info/12 text-info">
      Terjadwal
    </Badge>
  )
}
