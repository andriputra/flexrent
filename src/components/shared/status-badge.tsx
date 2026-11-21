import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { VehicleStatus, VehicleType } from "@prisma/client"

const VEHICLE_STATUS: Record<VehicleStatus, { label: string; className: string }> = {
  AVAILABLE: { label: "Tersedia", className: "bg-success/12 text-success" },
  RENTED: { label: "Disewa", className: "bg-info/12 text-info" },
  MAINTENANCE: { label: "Perawatan", className: "bg-warning/15 text-warning" },
  INACTIVE: { label: "Nonaktif", className: "bg-muted text-muted-foreground" },
}

export function VehicleStatusBadge({
  status,
  className,
}: {
  status: VehicleStatus
  className?: string
}) {
  const config = VEHICLE_STATUS[status]
  return (
    <Badge variant="secondary" className={cn("border-transparent", config.className, className)}>
      {config.label}
    </Badge>
  )
}

export function vehicleStatusLabel(status: VehicleStatus): string {
  return VEHICLE_STATUS[status].label
}

export function VehicleTypeBadge({ type, className }: { type: VehicleType; className?: string }) {
  return (
    <Badge
      variant="secondary"
      className={cn("border-transparent bg-primary/90 text-primary-foreground", className)}
    >
      {type === "MOTOR" ? "Motor" : "Mobil"}
    </Badge>
  )
}
