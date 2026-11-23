import Link from "next/link"
import type { TestimonialStatus } from "@prisma/client"
import { Quote, Star } from "lucide-react"
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
import { RatingStars } from "@/components/testimonials/rating"
import { NewTestimonialDialog } from "@/components/testimonials/new-testimonial-dialog"
import { TestimonialFilterBar } from "@/components/testimonials/testimonial-filter-bar"
import { TestimonialRowActions } from "@/components/testimonials/testimonial-row-actions"
import { requireTenant } from "@/lib/tenant"
import { formatDateId } from "@/lib/datetime"
import { getVehicleOptions } from "@/server/queries/vehicles"
import { listTestimonials, type TestimonialRow } from "@/server/queries/testimonials"

export const metadata = { title: "Testimoni" }

type SearchParams = { status?: string; vehicle?: string; page?: string }

const STATUSES = new Set(["PENDING", "PUBLISHED", "HIDDEN"])

function StatusBadge({ status }: { status: TestimonialRow["status"] }) {
  if (status === "PUBLISHED") {
    return (
      <Badge variant="secondary" className="border-transparent bg-success/12 text-success">
        Tampil
      </Badge>
    )
  }
  if (status === "PENDING") {
    return (
      <Badge variant="secondary" className="border-transparent bg-warning/15 text-warning">
        Menunggu
      </Badge>
    )
  }
  return <Badge variant="secondary">Disembunyikan</Badge>
}

function AuthorCell({ row }: { row: TestimonialRow }) {
  return (
    <div className="flex items-center gap-2">
      {row.photoUrl ? (
        <img
          src={row.photoUrl}
          alt=""
          loading="lazy"
          className="size-8 shrink-0 rounded-full border object-cover"
        />
      ) : (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
          {row.author.trim().slice(0, 1).toUpperCase()}
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{row.author}</p>
        <p className="text-xs text-muted-foreground">
          {row.source === "PUBLIC" ? "dikirim pengunjung" : "ditulis staf"}
        </p>
      </div>
    </div>
  )
}

export default async function TestimonialsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const context = await requireTenant()
  const params = await searchParams

  const requestedStatus = params.status && STATUSES.has(params.status)
    ? (params.status as TestimonialStatus)
    : undefined
  const requestedVehicle = params.vehicle || undefined
  const listFilters = {
    status: requestedStatus,
    page: Math.max(1, Number(params.page ?? 1) || 1),
  }

  const [vehicles, filtered] = await Promise.all([
    getVehicleOptions(context.tenant.id),
    listTestimonials(context.tenant.id, { ...listFilters, vehicleId: requestedVehicle }),
  ])
  const vehicleIds = new Set(vehicles.map((vehicle) => vehicle.id))
  const activeVehicle = requestedVehicle && vehicleIds.has(requestedVehicle) ? requestedVehicle : undefined

  // Filter kendaraan asing menghasilkan nol baris, jadi daftar diambil ulang tanpa filter itu.
  const { rows, total, pending, page, totalPages } =
    activeVehicle || !requestedVehicle
      ? filtered
      : await listTestimonials(context.tenant.id, listFilters)

  const options = vehicles.map((vehicle) => ({
    id: vehicle.id,
    label: `${vehicle.brand} ${vehicle.model} · ${vehicle.plate}`,
  }))

  const pageHref = (target: number) => {
    const query = new URLSearchParams()
    if (params.status) query.set("status", params.status)
    if (params.vehicle) query.set("vehicle", params.vehicle)
    if (target > 1) query.set("page", String(target))
    const suffix = query.toString()
    return `/dashboard/testimonials${suffix ? `?${suffix}` : ""}`
  }

  return (
    <>
      <PageHeader
        title="Testimoni"
        description="Kumpulkan bukti kepuasan pelanggan. Ulasan yang dikirim dari halaman publik masuk antrean dan baru tampil setelah diterbitkan."
        actions={<NewTestimonialDialog vehicles={options} readOnly={context.isReadOnly} />}
      />

      <TestimonialFilterBar vehicles={options} total={total} pending={pending} />

      {rows.length === 0 ? (
        <EmptyState
          icon={<Quote aria-hidden />}
          title={total === 0 ? "Belum ada testimoni" : "Tidak ada ulasan yang cocok"}
          description={
            total === 0
              ? "Tulis ulasan dari percakapan WhatsApp atau minta pelanggan mengirimnya lewat halaman publik."
              : "Ubah filter status atau kendaraan untuk melihat ulasan lain."
          }
          action={
            context.isReadOnly ? null : (
              <Button className="bg-accent text-accent-foreground hover:bg-accent-hover" asChild>
                <Link href={`/${context.tenant.slug}`} target="_blank">
                  <Star aria-hidden />
                  Buka halaman publik
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
                  <TableHead className="w-[170px]">Pengulas</TableHead>
                  <TableHead className="w-[100px]">Rating</TableHead>
                  <TableHead>Ulasan</TableHead>
                  <TableHead className="w-[170px]">Kendaraan</TableHead>
                  <TableHead className="w-[100px]">Tanggal</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[48px] text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="py-2.5">
                      <AuthorCell row={row} />
                    </TableCell>
                    <TableCell>
                      <RatingStars value={row.rating} />
                    </TableCell>
                    <TableCell>
                      {/* Sel tabel defaultnya nowrap; line-clamp butuh teks boleh dibariskan. */}
                      <p className="line-clamp-2 whitespace-normal text-sm leading-5 text-foreground/90">
                        {row.message}
                      </p>
                    </TableCell>
                    <TableCell>
                      {row.vehicle ? (
                        <Link
                          href={`/dashboard/vehicles/${row.vehicle.id}`}
                          className="inline-block max-w-[150px] truncate align-bottom text-sm font-medium hover:underline"
                        >
                          {row.vehicle.brand} {row.vehicle.model}
                        </Link>
                      ) : (
                        <span className="text-sm text-muted-foreground">Umum</span>
                      )}
                      {row.vehicle ? (
                        <p className="font-mono text-xs tracking-wider text-muted-foreground">
                          {row.vehicle.plate}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {formatDateId(row.occurredAt, "d MMM yyyy")}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <TestimonialRowActions
                        row={row}
                        vehicles={options}
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
            {rows.map((row) => (
              <li key={row.id}>
                <Card className="shadow-card">
                  <CardContent className="space-y-2 px-4 py-4">
                    <div className="flex items-start justify-between gap-2">
                      <AuthorCell row={row} />
                      <TestimonialRowActions
                        row={row}
                        vehicles={options}
                        readOnly={context.isReadOnly}
                        canDelete={context.canManage}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <RatingStars value={row.rating} />
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {formatDateId(row.occurredAt, "d MMM yyyy")}
                      </span>
                      <StatusBadge status={row.status} />
                    </div>
                    <p className="text-sm">{row.message}</p>
                    {row.vehicle ? (
                      <p className="text-xs text-muted-foreground">
                        {row.vehicle.brand} {row.vehicle.model} · {row.vehicle.plate}
                      </p>
                    ) : null}
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
