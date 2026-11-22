import Link from "next/link"
import { Ban, ShieldCheck, ShieldOff, Users, UsersRound } from "lucide-react"
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
import { CustomerFilterBar } from "@/components/customers/customer-filter-bar"
import { CustomerRowActions } from "@/components/customers/customer-row-actions"
import { formatDateId } from "@/lib/datetime"
import { formatRupiah } from "@/lib/format"
import { requireTenant } from "@/lib/tenant"
import { listCustomers } from "@/server/queries/customers"

export const metadata = { title: "Pelanggan" }

type SearchParams = { cari?: string; status?: string; verifikasi?: string; page?: string }

const STATUS_VALUES = ["BLACKLIST", "NORMAL"] as const
const VERIFY_VALUES = ["VERIFIED", "UNVERIFIED"] as const

export default async function CustomersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const context = await requireTenant()
  const params = await searchParams

  const status = STATUS_VALUES.includes(params.status as (typeof STATUS_VALUES)[number])
    ? (params.status as (typeof STATUS_VALUES)[number])
    : undefined
  const verifikasi = VERIFY_VALUES.includes(params.verifikasi as (typeof VERIFY_VALUES)[number])
    ? (params.verifikasi as (typeof VERIFY_VALUES)[number])
    : undefined
  const cari = params.cari?.trim() || undefined

  const pageHref = (target: number) => {
    const query = new URLSearchParams()
    if (status) query.set("status", status)
    if (verifikasi) query.set("verifikasi", verifikasi)
    if (cari) query.set("cari", cari)
    if (target > 1) query.set("page", String(target))
    const suffix = query.toString()
    return `/dashboard/customers${suffix ? `?${suffix}` : ""}`
  }

  const { rows, total, blacklisted, summaries, page, totalPages } = await listCustomers(context.tenant.id, {
    q: cari,
    status,
    verifikasi,
    page: Math.max(1, Number(params.page ?? 1) || 1),
  })

  return (
    <>
      <PageHeader
        title="Pelanggan"
        description="Setiap pesanan dari halaman publik menautkan pelanggannya di sini: riwayat sewa, status verifikasi dokumen, dan daftar hitam."
      />
      <CustomerFilterBar total={total} blacklisted={blacklisted} />

      {rows.length === 0 ? (
        <EmptyState
          icon={<Users aria-hidden />}
          title={total === 0 ? "Belum ada pelanggan" : "Tidak ada pelanggan yang cocok"}
          description={
            total === 0
              ? "Data pelanggan terbentuk otomatis dari pesanan yang masuk lewat halaman publik rental Anda."
              : "Coba kata kunci lain, atau setel filter status dan verifikasi."
          }
          action={null}
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border bg-card shadow-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[280px]">Pelanggan</TableHead>
                  <TableHead className="w-[104px] text-right">Pesanan</TableHead>
                  <TableHead className="w-[150px] text-right">Nilai sewa</TableHead>
                  <TableHead className="w-[168px]">Pesanan terakhir</TableHead>
                  <TableHead className="w-[232px]">Dokumen</TableHead>
                  <TableHead className="w-[52px]">
                    <span className="sr-only">Aksi</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((customer) => {
                  const summary = summaries.get(customer.id)
                  return (
                    <TableRow key={customer.id}>
                      <TableCell className="py-2.5">
                        <div className="flex min-w-0 items-center gap-2">
                          <Link
                            href={`/dashboard/customers/${customer.id}`}
                            className="max-w-[250px] truncate text-sm font-medium hover:underline"
                          >
                            {customer.name}
                          </Link>
                          {customer.isBlacklisted ? (
                            <Badge variant="outline" className="shrink-0 border-transparent bg-danger/12 text-danger">
                              <Ban aria-hidden className="size-3" />
                              Daftar hitam
                            </Badge>
                          ) : null}
                        </div>
                        <p className="max-w-[250px] truncate text-xs tabular-nums">
                          <span className="text-foreground/80">{customer.phone}</span>
                          {customer.city ? (
                            <span className="text-muted-foreground"> · {customer.city}</span>
                          ) : null}
                        </p>
                        {customer.isBlacklisted && customer.blacklistReason ? (
                          <p className="max-w-[250px] truncate text-xs text-danger/80">{customer.blacklistReason}</p>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {summary?.bookings ?? 0}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium tabular-nums">
                        {formatRupiah(summary?.orderValue ?? 0)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground tabular-nums">
                        {summary?.lastStartsAt ? formatDateId(summary.lastStartsAt, "d MMM yyyy") : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          {customer.documents.length > 0 ? (
                            <Badge variant="outline" className="border-transparent bg-success/12 text-success">
                              <ShieldCheck aria-hidden className="size-3" />
                              Terverifikasi
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-transparent bg-muted text-muted-foreground">
                              <ShieldOff aria-hidden className="size-3" />
                              Belum
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {customer._count.documents} dokumen
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <CustomerRowActions
                          customer={{
                            id: customer.id,
                            name: customer.name,
                            isBlacklisted: customer.isBlacklisted,
                            blacklistReason: customer.blacklistReason,
                          }}
                          readOnly={context.isReadOnly}
                          canManage={context.canManage}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          <ul className="space-y-3 md:hidden">
            {rows.map((customer) => {
              const summary = summaries.get(customer.id)
              return (
                <li key={customer.id}>
                  <Card className="shadow-card">
                    <CardContent className="space-y-2.5 px-4 py-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link
                            href={`/dashboard/customers/${customer.id}`}
                            className="truncate text-sm font-semibold hover:underline"
                          >
                            {customer.name}
                          </Link>
                          <p className="text-xs text-muted-foreground tabular-nums">{customer.phone}</p>
                        </div>
                        <CustomerRowActions
                          customer={{
                            id: customer.id,
                            name: customer.name,
                            isBlacklisted: customer.isBlacklisted,
                            blacklistReason: customer.blacklistReason,
                          }}
                          readOnly={context.isReadOnly}
                          canManage={context.canManage}
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="border-transparent bg-muted">
                          <UsersRound aria-hidden className="size-3" />
                          {summary?.bookings ?? 0} pesanan
                        </Badge>
                        {customer.documents.length > 0 ? (
                          <Badge variant="outline" className="border-transparent bg-success/12 text-success">
                            <ShieldCheck aria-hidden className="size-3" />
                            Dokumen oke
                          </Badge>
                        ) : null}
                        {customer.isBlacklisted ? (
                          <Badge variant="outline" className="border-transparent bg-danger/12 text-danger">
                            <Ban aria-hidden className="size-3" />
                            Daftar hitam
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-sm tabular-nums">
                        {formatRupiah(summary?.orderValue ?? 0)}
                        {summary?.lastStartsAt ? (
                          <span className="text-xs text-muted-foreground">
                            {" · "}
                            terakhir {formatDateId(summary.lastStartsAt, "d MMM yyyy")}
                          </span>
                        ) : null}
                      </p>
                    </CardContent>
                  </Card>
                </li>
              )
            })}
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
