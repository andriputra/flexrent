import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { BookingPaymentStatus, BookingStatus, VehicleStatus, VehicleType } from "@prisma/client"

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

const BOOKING_STATUS: Record<BookingStatus, { label: string; className: string }> = {
  PENDING: { label: "Menunggu konfirmasi", className: "bg-warning/15 text-warning" },
  CONFIRMED: { label: "Dikonfirmasi", className: "bg-info/12 text-info" },
  ONGOING: { label: "Sedang disewa", className: "bg-primary/12 text-primary" },
  COMPLETED: { label: "Selesai", className: "bg-success/12 text-success" },
  CANCELLED: { label: "Dibatalkan", className: "bg-muted text-muted-foreground" },
  EXPIRED: { label: "Kedaluwarsa", className: "bg-muted text-muted-foreground" },
}

export function bookingStatusLabel(status: BookingStatus): string {
  return BOOKING_STATUS[status].label
}

export function BookingStatusBadge({
  status,
  className,
}: {
  status: BookingStatus
  className?: string
}) {
  const config = BOOKING_STATUS[status]
  return (
    <Badge variant="secondary" className={cn("border-transparent", config.className, className)}>
      {config.label}
    </Badge>
  )
}

const PAYMENT_STATUS: Record<BookingPaymentStatus, { label: string; className: string }> = {
  UNPAID: { label: "Belum dibayar", className: "bg-muted text-muted-foreground" },
  PARTIAL: { label: "Dibayar sebagian", className: "bg-warning/15 text-warning" },
  PAID: { label: "Lunas", className: "bg-success/12 text-success" },
  REFUNDED: { label: "Dikembalikan", className: "bg-info/12 text-info" },
}

export function BookingPaymentBadge({
  status,
  className,
}: {
  status: BookingPaymentStatus
  className?: string
}) {
  const config = PAYMENT_STATUS[status]
  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  )
}
