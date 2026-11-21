import { Skeleton } from "@/components/ui/skeleton"
import { VehicleAvailabilityCalendar } from "@/components/vehicles/availability-calendar"
import { addDays } from "@/lib/datetime"
import { getPublicCalendarIntervals } from "@/server/queries/public"

export async function VehicleAvailabilitySection({
  tenantId,
  vehicleId,
}: {
  tenantId: string
  vehicleId: string
}) {
  const now = new Date()
  const intervals = await getPublicCalendarIntervals(tenantId, vehicleId, now, addDays(now, 92))

  return (
    <section className="rounded-2xl border bg-card p-4 sm:p-5">
      <h2 className="mb-1 text-base font-semibold">Kalender ketersediaan</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Tiga bulan ke depan. Tanggal terpesan tidak bisa dipilih.
      </p>
      <VehicleAvailabilityCalendar intervals={intervals} />
    </section>
  )
}

export function VehicleAvailabilitySkeleton() {
  return (
    <section className="rounded-2xl border bg-card p-4 sm:p-5">
      <Skeleton className="mb-2 h-5 w-44" />
      <Skeleton className="mb-4 h-4 w-full max-w-md" />
      <div className="space-y-3">
        <Skeleton className="h-52 w-full rounded-xl" />
        <Skeleton className="h-52 w-full rounded-xl" />
      </div>
    </section>
  )
}
