import Link from "next/link"
import { Bike, Car, Plus, Settings2, Zap } from "lucide-react"
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
import { VehicleRowActions } from "@/components/vehicles/vehicle-row-actions"
import { VehicleTypeBadge, VehicleStatusBadge } from "@/components/shared/status-badge"
import { VehicleFilterBar } from "@/components/vehicles/vehicle-filter-bar"
import { formatRupiah } from "@/lib/format"
import { requireTenant } from "@/lib/tenant"
import { listVehicles, type VehicleRow } from "@/server/queries/vehicles"
import { cn } from "@/lib/utils"
import type { FuelType, Transmission, VehicleStatus, VehicleType } from "@prisma/client"

type SearchParams = {
  q?: string
  type?: string
  status?: string
  page?: string
}

const TRANSMISSION_LABEL: Record<Transmission, string> = { MANUAL: "Manual", MATIC: "Matic" }
const FUEL_LABEL: Record<FuelType, string> = {
  PETROL: "Bensin",
  DIESEL: "Diesel",
  HYBRID: "Hybrid",
  ELECTRIC: "Listrik",
}
const STATUSES: VehicleStatus[] = ["AVAILABLE", "RENTED", "MAINTENANCE", "INACTIVE"]

function specLine(vehicle: VehicleRow) {
  const parts = [TRANSMISSION_LABEL[vehicle.transmission]]
  if (vehicle.type === "MOTOR" && vehicle.engineCc) parts.push(`${vehicle.engineCc} CC`)
  if (vehicle.type === "MOBIL" && vehicle.seats) parts.push(`${vehicle.seats} kursi`)
  parts.push(FUEL_LABEL[vehicle.fuelType])
  if (vehicle.hasDriver) parts.push("dengan sopir")
  return parts.join(" · ")
}

function buildQuery(params: SearchParams, overrides: Record<string, string | undefined>) {
  const merged = { ...params, ...overrides }
  const search = new URLSearchParams()
  if (merged.q) search.set("q", merged.q)
  if (merged.type) search.set("type", merged.type)
  if (merged.status) search.set("status", merged.status)
  if (merged.page && merged.page !== "1") search.set("page", merged.page)
  const query = search.toString()
  return query ? `/dashboard/vehicles?${query}` : "/dashboard/vehicles"
}

function Pagination({
  params,
  page,
  totalPages,
}: {
  params: SearchParams
  page: number
  totalPages: number
}) {
  return (
    <nav aria-label="Navigasi halaman" className="flex flex-wrap items-center justify-between gap-3 pt-1">
      <p className="text-sm text-muted-foreground">
        Halaman {page} dari {totalPages}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Button asChild variant="outline" size="sm">
            <Link href={buildQuery(params, { page: String(page - 1) })}>Sebelumnya</Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Sebelumnya
          </Button>
        )}
        {page < totalPages ? (
          <Button asChild variant="outline" size="sm">
            <Link href={buildQuery(params, { page: String(page + 1) })}>Berikutnya</Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Berikutnya
          </Button>
        )}
      </div>
    </nav>
  )
}

function VehicleThumb({ vehicle, className }: { vehicle: VehicleRow; className?: string }) {
  const photo = vehicle.photos[0]
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-muted-foreground",
        className ?? "size-24"
      )}
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo.url}
          alt={`Foto ${vehicle.brand} ${vehicle.model}`}
          loading="lazy"
          className="size-full object-cover"
        />
      ) : (
        <Bike aria-hidden className="size-6" />
      )}
    </div>
  )
}

function PriceBlock({ vehicle }: { vehicle: VehicleRow }) {
  return (
    <div className="space-y-0.5">
      <p className="text-sm font-semibold tabular-nums">
        {formatRupiah(vehicle.priceDaily)}
        <span className="text-xs font-normal text-muted-foreground"> /hari</span>
      </p>
      <p className="text-xs text-muted-foreground tabular-nums">
        {vehicle.priceWeekly ? formatRupiah(vehicle.priceWeekly) : "—"} /mgg ·{" "}
        {vehicle.priceMonthly ? formatRupiah(vehicle.priceMonthly) : "—"} /bln
      </p>
      <p className="text-xs text-muted-foreground tabular-nums">
        Deposit {vehicle.deposit ? formatRupiah(vehicle.deposit) : "tidak ada"}
      </p>
    </div>
  )
}

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const context = await requireTenant()
  const params = await searchParams

  const filters = {
    type: params.type === "MOTOR" || params.type === "MOBIL" ? (params.type as VehicleType) : undefined,
    status: STATUSES.includes(params.status as VehicleStatus)
      ? (params.status as VehicleStatus)
      : undefined,
    search: params.q?.trim() || undefined,
    page: Math.max(1, Number(params.page ?? 1) || 1),
  }

  const { rows, total, page, totalPages } = await listVehicles(context.tenant.id, filters)
  const limit = context.plan?.maxVehicles ?? null
  const fleetFull = limit !== null && total >= limit

  return (
    <>
      <PageHeader
        title="Kendaraan"
        description="Kelola motor dan mobil sewaan Anda: foto, spesifikasi, tarif, deposit, dan status armada."
        actions={
          <Button
            asChild
            className="bg-accent text-accent-foreground hover:bg-accent-hover"
            disabled={context.isReadOnly || fleetFull}
          >
            <Link href="/dashboard/vehicles/new">
              <Plus aria-hidden />
              Tambah kendaraan
            </Link>
          </Button>
        }
      />

      {limit !== null ? (
        <Card className="shadow-card">
          <CardContent className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">
              <span className="font-semibold tabular-nums">{total}</span> dari {limit} slot armada
              paket {context.plan?.name}
              {fleetFull ? (
                <span className="text-danger"> · paket Anda sudah penuh</span>
              ) : null}
            </p>
            <Button asChild variant={fleetFull ? "outline" : "ghost"} size="sm">
              <Link href="/harga">
                <Settings2 aria-hidden />
                {fleetFull ? "Upgrade paket untuk menambah armada" : "Bandingkan paket"}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <VehicleFilterBar total={total} />

      {rows.length === 0 && fleetFull ? (
        <EmptyState
          icon={<Zap aria-hidden />}
          title="Slot armada paket Anda sudah penuh"
          description={`Paket ${context.plan?.name} mengizinkan ${limit} kendaraan. Upgrade paket untuk menambah armada lain.`}
          action={
            <Button asChild variant="outline">
              <Link href="/harga">Lihat pilihan paket</Link>
            </Button>
          }
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={filters.type === "MOBIL" ? <Car aria-hidden /> : <Bike aria-hidden />}
          title={filters.search ? "Tidak ada kendaraan yang cocok" : "Belum ada kendaraan"}
          description={
            filters.search
              ? `Kendaraan dengan plat, merek, atau model "${filters.search}" tidak ditemukan. Coba kata kunci lain atau reset filter.`
              : "Tambahkan motor atau mobil pertama agar pelanggan bisa mulai memesan."
          }
          action={
            context.isReadOnly ? null : (
              <Button asChild className="bg-accent text-accent-foreground hover:bg-accent-hover">
                <Link href="/dashboard/vehicles/new">Tambah kendaraan</Link>
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
                  <TableHead className="w-[112px]">Foto</TableHead>
                  <TableHead>Kendaraan</TableHead>
                  <TableHead className="w-[92px]">Tipe</TableHead>
                  <TableHead className="w-[112px]">Status</TableHead>
                  <TableHead className="w-[180px]">Tarif</TableHead>
                  <TableHead className="w-[56px] text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell>
                      <VehicleThumb vehicle={vehicle} className="size-20" />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <Link
                          href={`/dashboard/vehicles/${vehicle.id}`}
                          className="text-sm font-medium hover:underline"
                        >
                          {vehicle.brand} {vehicle.model}
                          <span className="text-muted-foreground"> · {vehicle.year}</span>
                        </Link>
                        <p className="font-mono text-xs tracking-wider text-muted-foreground">
                          {vehicle.plate}
                        </p>
                        <p className="text-xs text-muted-foreground">{specLine(vehicle)}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <VehicleTypeBadge type={vehicle.type} />
                    </TableCell>
                    <TableCell>
                      <VehicleStatusBadge status={vehicle.status} />
                    </TableCell>
                    <TableCell>
                      <PriceBlock vehicle={vehicle} />
                    </TableCell>
                    <TableCell className="text-right">
                      <VehicleRowActions
                        vehicle={{ id: vehicle.id, plate: vehicle.plate, isPublished: vehicle.isPublished }}
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
            {rows.map((vehicle) => (
              <li key={vehicle.id}>
                <Card className="shadow-card">
                  <CardContent className="flex gap-3 px-4 py-4">
                    <VehicleThumb vehicle={vehicle} className="size-20" />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/dashboard/vehicles/${vehicle.id}`}
                          className="min-w-0 truncate text-sm font-semibold"
                        >
                          {vehicle.brand} {vehicle.model}
                        </Link>
                        <VehicleRowActions
                          vehicle={{ id: vehicle.id, plate: vehicle.plate, isPublished: vehicle.isPublished }}
                          readOnly={context.isReadOnly}
                          canDelete={context.canManage}
                        />
                      </div>
                      <p className="font-mono text-xs tracking-wider text-muted-foreground">
                        {vehicle.plate}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <VehicleTypeBadge type={vehicle.type} />
                        <VehicleStatusBadge status={vehicle.status} />
                      </div>
                      <p className="text-xs text-muted-foreground">{specLine(vehicle)}</p>
                      <PriceBlock vehicle={vehicle} />
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>

          {totalPages > 1 ? <Pagination params={params} page={page} totalPages={totalPages} /> : null}
        </>
      )}
    </>
  )
}
