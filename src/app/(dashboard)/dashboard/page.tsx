import Link from "next/link"
import { Armchair, Bike, CalendarClock, Percent, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState, PageHeader, StatCard } from "@/components/shared/layout-parts"
import { VehicleTypeBadge } from "@/components/shared/status-badge"
import { formatDateId } from "@/lib/datetime"
import { formatPercent, formatRupiah } from "@/lib/format"
import { requireTenant } from "@/lib/tenant"
import { getDashboardSummary } from "@/server/queries/dashboard"

export default async function DashboardPage() {
  const context = await requireTenant()
  const summary = await getDashboardSummary(context.tenant.id)

  return (
    <>
      <PageHeader
        title={`Halo, ${context.tenant.name}`}
        description={`Ringkasan armada dan booking ${context.tenant.city}. Semua angka dihitung dalam WIB.`}
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total armada"
          value={String(summary.vehicleTotal)}
          hint={`${summary.availableCount} tersedia · ${summary.maintenanceCount} perawatan`}
          icon={<Bike aria-hidden />}
        />
        <StatCard
          label="Booking aktif"
          value={String(summary.activeBookingCount)}
          hint={`${summary.ongoingCount} sedang berjalan`}
          icon={<CalendarClock aria-hidden />}
        />
        <StatCard
          label="Okupansi 30 hari"
          value={formatPercent(summary.occupancyRate)}
          hint={summary.vehicleTotal > 0 ? "Hari kendaraan terpesan" : "Belum ada armada"}
          icon={<Percent aria-hidden />}
        />
        <StatCard
          label="Nilai booking bulan ini"
          value={formatRupiah(summary.monthRevenue)}
          hint={`${summary.monthBookingCount} booking dikonfirmasi/selesai`}
          icon={<Wallet aria-hidden />}
        />
      </div>

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

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">Kembali hari ini</CardTitle>
          <p className="text-sm text-muted-foreground">
            Kendaraan yang jatuh tempo pengembalian hari ini, urut berdasarkan jam sewa selesai.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {summary.returnsToday.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">
              Tidak ada kendaraan yang perlu kembali hari ini.
            </p>
          ) : (
            <ul className="divide-y">
              {summary.returnsToday.map((booking) => (
                <li key={booking.id} className="flex items-center justify-between gap-3 px-5 py-3">
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
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {formatDateId(booking.endsAt, "HH:mm")}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  )
}
