import { CalendarDays } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { PublicPanel, SectionHeading } from "@/components/shared/layout-parts"
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
    <PublicPanel className="reveal">
      <SectionHeading icon={<CalendarDays aria-hidden />} description="Tiga bulan ke depan. Tanggal terpesan tidak bisa dipilih.">
        Kalender ketersediaan
      </SectionHeading>
      <VehicleAvailabilityCalendar intervals={intervals} />
    </PublicPanel>
  )
}

export function VehicleAvailabilitySkeleton() {
  return (
    <PublicPanel>
      <div className="mb-4 flex items-center gap-2.5">
        <Skeleton className="size-8 rounded-xl" />
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-3.5 w-56" />
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-52 w-full rounded-xl" />
        <Skeleton className="h-52 w-full rounded-xl" />
      </div>
    </PublicPanel>
  )
}
