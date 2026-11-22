import Link from "next/link"
import {
  AlarmClockOff,
  Armchair,
  Bike,
  CalendarClock,
  Clock,
  Inbox,
  Percent,
  ReceiptText,
  Wallet,
  Wrench,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState, PageHeader } from "@/components/shared/layout-parts"
import { RevenueChart } from "@/components/dashboard/revenue-chart"
import { MetricCard, SegmentBar, Sparkline } from "@/components/dashboard/metric-card"
import {
  AttentionPanel,
  FleetStatus,
  ReturnStrip,
  type AttentionItem,
} from "@/components/dashboard/dashboard-panels"
import { VehicleTypeBadge } from "@/components/shared/status-badge"
import { formatDateId, toDayKey } from "@/lib/datetime"
import { formatPercent, formatRupiah } from "@/lib/format"
import { requireTenant } from "@/lib/tenant"
import { getDashboardSummary } from "@/server/queries/dashboard"

type Trend = { direction: "up" | "down" | "flat"; label: string }

function trendBetween(current: number, previous: number): Trend | undefined {
  // Tanpa pembanding yang berarti angka tren hanya menyesatkan.
  if (previous <= 0) return undefined
  const pct = ((current - previous) / previous) * 100
  const rounded = Math.round(Math.abs(pct))
  if (rounded === 0) return { direction: "flat", label: "stabil" }
  return {
    direction: pct > 0 ? "up" : "down",
    label: `${pct > 0 ? "+" : "−"}${rounded}%`,
  }
}

export default async function DashboardPage() {
  const context = await requireTenant()
  const summary = await getDashboardSummary(context.tenant.id)
  const now = new Date()
  const todayKey = toDayKey(now)
  const confirmedCount = Math.max(0, summary.activeBookingCount - summary.ongoingCount - summary.pendingBookingCount)

  const monthTrend = trendBetween(summary.monthRevenue, summary.prevMonthRevenue)
  const sparkline = summary.revenueSeries.slice(-14).map((point) => point.amount)
  const rentedPercent =
    summary.vehicleTotal > 0 ? Math.round((summary.ongoingCount / summary.vehicleTotal) * 100) : 0
  const revenuePerVehicle =
    summary.vehicleTotal > 0 ? Math.round(summary.monthRevenue / summary.vehicleTotal) : 0

  const attention: AttentionItem[] = [
    {
      href: "/dashboard/bookings",
      label: "Lewat jadwal kembali",
      detail: "Sewa berjalan yang belum ditutup lewat dari tanggal kembali",
      value: summary.overdueReturnCount,
      tone: "danger",
      icon: <AlarmClockOff aria-hidden />,
    },
    {
      href: "/dashboard/bookings?status=PENDING",
      label: "Menunggu konfirmasi",
      detail: "Pemesanan dari halaman publik yang belum diterima",
      value: summary.pendingBookingCount,
      tone: "warning",
      icon: <Inbox aria-hidden />,
    },
    {
      href: "/dashboard/payments",
      label: "Pembayaran belum lunas",
      detail: "Sewa berjalan dengan pembayaran kurang atau nihil",
      value: summary.unpaidCount,
      tone: "info",
      icon: <ReceiptText aria-hidden />,
    },
    {
      href: "/dashboard/maintenance",
      label: "Perawatan jatuh tempo",
      detail: summary.maintenanceDue[0]
        ? `Terdekat: ${summary.maintenanceDue[0].vehicle.plate} · ${summary.maintenanceDue[0].title}`
        : "Jadwal 14 hari ke depan yang belum diselesaikan",
      value: summary.maintenanceDueCount,
      tone: "primary",
      icon: <Wrench aria-hidden />,
    },
  ]

  return (
    <>
      <PageHeader
        title={`Halo, ${context.tenant.name}`}
        description={
          <>
            {formatDateId(now, "EEEE, d MMMM yyyy")} · ringkasan armada dan booking{" "}
            {context.tenant.city}. Semua angka dihitung dalam WIB.
          </>
        }
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/dashboard/maintenance">Jadwalkan perawatan</Link>
            </Button>
            <Button asChild className="bg-accent text-accent-foreground hover:bg-accent-hover">
              <Link href="/dashboard/vehicles/new">Tambah kendaraan</Link>
            </Button>
          </>
        }
      />

      {summary.vehicleTotal === 0 ? (
        <EmptyState
          icon={<Armchair aria-hidden />}
          title="Armada masih kosong"
          description="Tambahkan motor atau mobil pertama agar pelanggan bisa mulai memesan lewat halaman publik rental Anda."
          action={
            <Button asChild className="bg-accent text-accent-foreground hover:bg-accent-hover">
              <Link href="/dashboard/vehicles/new">Tambah kendaraan pertama</Link>
            </Button>
          }
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          index={0}
          label="Total armada"
          value={String(summary.vehicleTotal)}
          hint={`${summary.availableCount} tersedia · ${summary.maintenanceCount} perawatan`}
          icon={<Bike aria-hidden />}
          href="/dashboard/vehicles"
          visual={
            <SegmentBar
              segments={[
                { value: summary.availableCount, className: "bg-success", label: "Tersedia" },
                { value: summary.maintenanceCount, className: "bg-warning", label: "Perawatan" },
                { value: summary.inactiveCount, className: "bg-muted-foreground/40", label: "Nonaktif" },
              ]}
            />
          }
        />
        <MetricCard
          index={1}
          label="Booking aktif"
          value={String(summary.activeBookingCount)}
          hint={`${summary.ongoingCount} berjalan · ${summary.pendingBookingCount} menunggu`}
          icon={<CalendarClock aria-hidden />}
          tone="accent"
          href="/dashboard/bookings"
          visual={
            <SegmentBar
              segments={[
                { value: summary.ongoingCount, className: "bg-accent", label: "Sedang berjalan" },
                { value: confirmedCount, className: "bg-info", label: "Dikonfirmasi" },
                { value: summary.pendingBookingCount, className: "bg-destructive/45", label: "Menunggu konfirmasi" },
              ]}
            />
          }
        />
        <MetricCard
          index={2}
          label="Okupansi 30 hari"
          value={formatPercent(summary.occupancyRate)}
          hint="Hari kendaraan terpesan"
          icon={<Percent aria-hidden />}
          tone="info"
          href="/dashboard/reports"
          visual={
            <SegmentBar
              segments={[
                { value: summary.occupancyRate, className: "bg-accent", label: "Terpakai" },
                { value: Math.max(0, 100 - summary.occupancyRate), className: "bg-primary/20", label: "Sisa" },
              ]}
            />
          }
        />
        <MetricCard
          index={3}
          label="Pendapatan bulan ini"
          value={formatRupiah(summary.monthRevenue)}
          hint={`Kas masuk ${summary.monthLabel}`}
          trend={monthTrend ? { ...monthTrend, label: `${monthTrend.label} vs bulan lalu` } : undefined}
          icon={<Wallet aria-hidden />}
          tone="success"
          href="/dashboard/reports"
          visual={<Sparkline values={sparkline} />}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="shadow-card xl:col-span-2">
          <CardHeader className="gap-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">Kas masuk harian</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/payments">Lihat pembayaran</Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Nominal yang benar-benar dibayar pelanggan (sewa dan denda), bukan nilai pesanan.
            </p>
          </CardHeader>
          <CardContent className="px-3 pb-4">
            <RevenueChart points={summary.revenueSeries} />
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="gap-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">Perlu perhatian</CardTitle>
              <span className="text-xs text-muted-foreground">hitung langsung saat halaman dibuka</span>
            </div>
            <p className="text-sm text-muted-foreground">Klik salah satu baris untuk membuka rinciannya.</p>
          </CardHeader>
          <CardContent className="p-0">
            <AttentionPanel items={attention} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="shadow-card xl:col-span-2">
          <CardHeader className="gap-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">Arus pengembalian</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/bookings">Semua booking</Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Kendaraan yang harus kembali tujuh hari ke depan, dan daftar jatuh tempo hari ini.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 px-4 pb-4">
            <ReturnStrip load={summary.returnLoad} todayKey={todayKey} />

            <div className="border-t pt-1">
              <p className="flex items-center gap-1.5 px-1 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground [&_svg]:size-3.5">
                <Clock aria-hidden />
                Kembali hari ini
              </p>
              {summary.returnsToday.length === 0 ? (
                <p className="px-1 py-5 text-center text-sm text-muted-foreground">
                  Tidak ada kendaraan yang perlu kembali hari ini.
                </p>
              ) : (
                <ul className="divide-y">
                  {summary.returnsToday.map((booking) => (
                    <li key={booking.id} className="flex items-center justify-between gap-3 px-1 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {booking.vehicle.plate} · {booking.vehicle.brand} {booking.vehicle.model}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {booking.customerName} · {booking.code}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <VehicleTypeBadge type={booking.vehicle.type} />
                        <span className="text-sm font-medium tabular-nums text-muted-foreground">
                          {formatDateId(booking.endsAt, "HH:mm")}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="gap-1">
            <CardTitle className="text-base">Kondisi armada</CardTitle>
            <p className="text-sm text-muted-foreground">
              Status {summary.vehicleTotal} kendaraan dan berapa banyak yang sedang bergerak.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <FleetStatus
              segments={[
                {
                  label: "Tersedia",
                  value: summary.availableCount,
                  bar: "bg-success",
                  dot: "bg-success",
                },
                {
                  label: "Perawatan",
                  value: summary.maintenanceCount,
                  bar: "bg-warning",
                  dot: "bg-warning",
                },
                {
                  label: "Nonaktif",
                  value: summary.inactiveCount,
                  bar: "bg-muted-foreground/40",
                  dot: "bg-muted-foreground/40",
                },
              ]}
              rentedPercent={rentedPercent}
              hint={
                summary.vehicleTotal > 0
                  ? `${summary.ongoingCount} dari ${summary.vehicleTotal} kendaraan ada di tangan pelanggan · rata-rata ${formatRupiah(revenuePerVehicle)} per kendaraan ${summary.monthLabel}`
                  : "Belum ada armada"
              }
            />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
