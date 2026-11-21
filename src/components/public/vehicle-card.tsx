import Link from "next/link"
import { Car, Fuel, Gauge, UserRound, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { VehicleTypeBadge } from "@/components/shared/status-badge"
import { formatRupiah } from "@/lib/format"
import type { listCatalogVehicles } from "@/server/queries/public"

type CardVehicle = Awaited<ReturnType<typeof listCatalogVehicles>>["rows"][number]

function specItems(vehicle: CardVehicle): { icon: React.ReactNode; text: string }[] {
  const items = [
    {
      icon: <Car aria-hidden className="size-4" />,
      text: vehicle.transmission === "MATIC" ? "Matic" : "Manual",
    },
  ]
  if (vehicle.type === "MOTOR") {
    items.push({
      icon: <Gauge aria-hidden className="size-4" />,
      text: vehicle.engineCc ? `${vehicle.engineCc} CC` : "Motor",
    })
  } else {
    items.push({
      icon: <Users aria-hidden className="size-4" />,
      text: vehicle.seats ? `${vehicle.seats} kursi` : "Mobil",
    })
  }
  items.push({
    icon: <Fuel aria-hidden className="size-4" />,
    text:
      vehicle.fuelType === "PETROL"
        ? "Bensin"
        : vehicle.fuelType === "DIESEL"
          ? "Solar"
          : vehicle.fuelType === "HYBRID"
            ? "Hybrid"
            : "Listrik",
  })
  if (vehicle.hasDriver) {
    items.push({
      icon: <UserRound aria-hidden className="size-4" />,
      text: "Bisa dengan sopir",
    })
  }
  return items
}

/** Kartu kendaraan sesuai panduan desain: foto 4:3, badge tipe, spesifikasi, harga besar. */
export function VehicleCard({
  vehicle,
  slug,
  range,
}: {
  vehicle: CardVehicle
  slug: string
  range: { ambil: string; kembali: string }
}) {
  const cover = vehicle.photos[0]
  const href = `/${slug}/kendaraan/${vehicle.id}${range.ambil && range.kembali ? `?ambil=${range.ambil}&kembali=${range.kembali}` : ""}`
  const alternates = [vehicle.priceWeekly, vehicle.priceMonthly].filter((value): value is number => Boolean(value))

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border bg-card shadow-card transition-shadow duration-150 hover:shadow-pop motion-reduce:transition-none">
      <div className="relative aspect-[4/3] bg-muted">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover.url}
            alt={`${vehicle.brand} ${vehicle.model}`}
            loading="lazy"
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <Car aria-hidden className="size-8" />
          </div>
        )}
        <VehicleTypeBadge type={vehicle.type} className="absolute top-3 left-3" />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-0.5">
          <h3 className="leading-6 font-semibold">
            {vehicle.brand} {vehicle.model}
          </h3>
          <p className="text-sm text-muted-foreground tabular-nums">
            {vehicle.year} · {vehicle.plate}
          </p>
        </div>

        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
          {specItems(vehicle).map((item) => (
            <li key={item.text} className="flex items-center gap-1.5">
              {item.icon}
              {item.text}
            </li>
          ))}
        </ul>

        <div className="mt-auto space-y-1 pt-1">
          <p className="text-xl leading-7 font-semibold tabular-nums">
            {formatRupiah(vehicle.priceDaily)}
            <span className="text-sm font-normal text-muted-foreground"> /hari</span>
          </p>
          {alternates.length ? (
            <p className="text-xs text-muted-foreground tabular-nums">
              {alternates.map((value) => formatRupiah(value)).join(" · ")}
            </p>
          ) : null}
        </div>

        <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent-hover">
          <Link href={href}>Pesan</Link>
        </Button>
      </div>
    </article>
  )
}
