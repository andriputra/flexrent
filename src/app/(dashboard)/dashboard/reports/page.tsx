import Link from "next/link"
import { Car, Download, FileSpreadsheet, Timer, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EmptyState, PageHeader, StatCard } from "@/components/shared/layout-parts"
import { VehicleTypeBadge } from "@/components/shared/status-badge"
import { addDays, diffInCalendarDays, formatDateId, fromWib, monthRangeWib, toDayKey } from "@/lib/datetime"
import { formatPercent, formatRupiah } from "@/lib/format"
import { revenueShare } from "@/lib/reports"
import { requireTenant } from "@/lib/tenant"
import { getVehicleRevenue, parseReportRange } from "@/server/queries/reports"

export const metadata = { title: "Laporan" }

type SearchParams = { dari?: string; sampai?: string }

function ShareBar({ share }: { share: number }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <span
          className="block h-full rounded-full bg-chart-2"
          style={{ width: `${Math.min(100, Math.round(share * 100))}%` }}
        />
      </span>
      <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
        {formatPercent(share * 100, 0)}
      </span>
    </div>
  )
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const context = await requireTenant()
  const params = await searchParams
  const now = new Date()

  const range = parseReportRange(params, now)
  const fromKey = toDayKey(range.start)
  const toKey = toDayKey(addDays(range.end, -1))

  const report = await getVehicleRevenue(context.tenant.id, range.start, range.end)

  const period = monthRangeWib(now)
  const todayStart = fromWib(toDayKey(now))
  const presets = [
    { label: "Bulan ini", start: period.start, end: period.end },
    { label: "30 hari terakhir", start: addDays(todayStart, -29), end: addDays(todayStart, 1) },
    { label: "7 hari terakhir", start: addDays(todayStart, -6), end: addDays(todayStart, 1) },
  ].map((preset) => {
    const last = addDays(preset.end, -1)
    return {
      ...preset,
      href: `/dashboard/reports?dari=${toDayKey(preset.start)}&sampai=${toDayKey(last)}`,
      active: toDayKey(preset.start) === fromKey && toDayKey(last) === toKey,
    }
  })

  const rangeLabel = `${formatDateId(range.start, "d MMM yyyy")} – ${formatDateId(addDays(range.end, -1), "d MMM yyyy")}`
  const exportHref = `/dashboard/reports/export?dari=${fromKey}&sampai=${toKey}`
  const spanDays = Math.max(1, diffInCalendarDays(range.start, addDays(range.end, -1)) + 1)
  const avgPerDay = report.totalRevenue > 0 ? report.totalRevenue / spanDays : 0
  const avgPerBooking = report.bookingCount > 0 ? report.totalRevenue / report.bookingCount : 0

  return (
    <>
      <PageHeader
        title="Laporan pendapatan"
        description={`Pendapatan dihitung dari pembayaran yang sudah tercatat (sewa dan denda) per tanggal bayar, bukan nilai pesanan. Rentang: ${rangeLabel}.`}
        actions={
          <Button asChild variant="outline">
            <Link href={exportHref}>
              <Download aria-hidden />
              Ekspor CSV
            </Link>
          </Button>
        }
      />

      <Card className="shadow-card">
        <CardContent className="space-y-4 px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            {presets.map((preset) => (
              <Button key={preset.label} asChild variant={preset.active ? "secondary" : "outline"} size="sm">
                <Link href={preset.href}>{preset.label}</Link>
              </Button>
            ))}
          </div>
          <form method="get" action="/dashboard/reports" className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dari">Dari tanggal</Label>
              <Input id="dari" name="dari" type="date" defaultValue={fromKey} className="w-44" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sampai">Sampai tanggal</Label>
              <Input id="sampai" name="sampai" type="date" defaultValue={toKey} className="w-44" />
            </div>
            <Button type="submit" size="sm" className="bg-accent text-accent-foreground hover:bg-accent-hover">
              Terapkan
            </Button>
            <p className="text-xs text-muted-foreground">
              Tanggal mengikuti kalender WIB. Hari terakhir ikut dihitung.
            </p>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Kas masuk"
          value={formatRupiah(report.totalRevenue)}
          hint={rangeLabel}
          icon={<TrendingUp aria-hidden />}
        />
        <StatCard
          label="Booking dalam rentang"
          value={String(report.bookingCount)}
          hint="Sewa yang berjalan atau selesai di rentang ini"
          icon={<Car aria-hidden />}
        />
        <StatCard
          label="Hari kendaraan terpakai"
          value={String(report.totalDays)}
          hint="Total hari sewa, dipotong batas rentang"
          icon={<Timer aria-hidden />}
        />
        <StatCard
          label="Rata-rata"
          value={formatRupiah(avgPerBooking)}
          hint={`per booking · ${formatRupiah(avgPerDay)} per hari`}
          icon={<FileSpreadsheet aria-hidden />}
        />
      </div>

      {report.rows.length === 0 ? (
        <EmptyState
          icon={<FileSpreadsheet aria-hidden />}
          title="Belum ada pemasukan di rentang ini"
          description="Pilih rentang tanggal lain, atau pastikan pembayaran booking sudah dicatat di halaman Pembayaran."
          action={null}
        />
      ) : (
        <Card className="shadow-card">
          <CardContent className="p-0">
            <div className="hidden overflow-x-auto lg:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kendaraan</TableHead>
                    <TableHead className="w-[110px] text-right">Booking</TableHead>
                    <TableHead className="w-[100px] text-right">Hari sewa</TableHead>
                    <TableHead className="w-[150px] text-right">Pendapatan</TableHead>
                    <TableHead className="w-[160px] text-right">Kontribusi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.rows.map((row) => (
                    <TableRow key={row.vehicleId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <VehicleTypeBadge type={row.type} />
                          <div className="min-w-0">
                            <Link
                              href={`/dashboard/vehicles/${row.vehicleId}`}
                              className="text-sm hover:underline"
                            >
                              {row.brand} {row.model}
                            </Link>
                            <p className="font-mono text-xs text-muted-foreground">{row.plate}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{row.bookings}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{row.days}</TableCell>
                      <TableCell className="text-right text-sm font-medium tabular-nums">
                        {formatRupiah(row.revenue)}
                      </TableCell>
                      <TableCell>
                        <ShareBar share={revenueShare(row, report.totalRevenue)} />
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 bg-muted/40">
                    <TableCell className="text-sm font-semibold">Total {report.rows.length} kendaraan</TableCell>
                    <TableCell className="text-right text-sm font-semibold tabular-nums">{report.bookingCount}</TableCell>
                    <TableCell className="text-right text-sm font-semibold tabular-nums">{report.totalDays}</TableCell>
                    <TableCell className="text-right text-sm font-semibold tabular-nums">
                      {formatRupiah(report.totalRevenue)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <ul className="divide-y space-y-0 lg:hidden">
              {report.rows.map((row) => (
                <li key={row.vehicleId} className="space-y-2 px-4 py-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={`/dashboard/vehicles/${row.vehicleId}`} className="text-sm hover:underline">
                        {row.brand} {row.model}
                      </Link>
                      <p className="font-mono text-xs text-muted-foreground">{row.plate}</p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums">{formatRupiah(row.revenue)}</p>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>
                      {row.bookings} booking · {row.days} hari
                    </span>
                    <ShareBar share={revenueShare(row, report.totalRevenue)} />
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </>
  )
}
