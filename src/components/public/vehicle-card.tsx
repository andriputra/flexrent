import Link from "next/link"
import { Bike, Car, Fuel, Gauge, UserRound, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { VehicleTypeBadge } from "@/components/shared/status-badge"
import { formatRupiah } from "@/lib/format"
import type { listCatalogVehicles } from "@/server/queries/public"

type CardVehicle = Awaited<ReturnType<typeof listCatalogVehicles>>["rows"][number]

function specItems(vehicle: CardVehicle): { icon: React.ReactNode; text: string }[] {
  const items = [
    {
      icon: <Car aria-hidden className="size-3.5" />,
      text: vehicle.transmission === "MATIC" ? "Matic" : "Manual",
    },
  ]
  if (vehicle.type === "MOTOR") {
    items.push({
      icon: <Gauge aria-hidden className="size-3.5" />,
      text: vehicle.engineCc ? `${vehicle.engineCc} CC` : "Motor",
    })
  } else {
    items.push({
      icon: <Users aria-hidden className="size-3.5" />,
      text: vehicle.seats ? `${vehicle.seats} kursi` : "Mobil",
    })
  }
  items.push({
    icon: <Fuel aria-hidden className="size-3.5" />,
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
      icon: <UserRound aria-hidden className="size-3.5" />,
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
  const PlaceholderIcon = vehicle.type === "MOTOR" ? Bike : Car

  return (
    <article className="group/card flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-card transition-[transform,box-shadow,border-color] duration-500 hover:-translate-y-1 hover:border-accent/40 hover:shadow-pop motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover.url}
            alt={`${vehicle.brand} ${vehicle.model}`}
            loading="lazy"
            className="size-full object-cover transition-transform duration-700 ease-out group-hover/card:scale-[1.05]"
          />
        ) : (
          <div className="bg-grid absolute inset-0 opacity-70" />
        )}
        {!cover ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="flex size-12 items-center justify-center rounded-2xl border border-border/70 bg-card/80 text-muted-foreground shadow-card backdrop-blur-sm transition-transform duration-500 group-hover/card:-translate-y-1 group-hover/card:text-foreground motion-reduce:transition-none motion-reduce:group-hover/card:translate-y-0">
              <PlaceholderIcon aria-hidden className="size-6" />
            </span>
          </div>
        ) : null}
        <VehicleTypeBadge type={vehicle.type} className="absolute top-3 left-3 shadow-card" />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-0.5">
          <h3 className="font-display leading-6 font-semibold tracking-tight">
            {vehicle.brand} {vehicle.model}
          </h3>
          <p className="text-sm text-muted-foreground tabular-nums">
            {vehicle.year} · {vehicle.plate}
          </p>
        </div>

        <ul className="flex flex-wrap gap-1.5">
          {specItems(vehicle).map((item) => (
            <li
              key={item.text}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground"
            >
              {item.icon}
              {item.text}
            </li>
          ))}
        </ul>

        <div className="mt-auto space-y-1 pt-1">
          <p className="flex items-baseline gap-1">
            <span className="text-[1.3rem] leading-7 font-extrabold tracking-tight tabular-nums">
              {formatRupiah(vehicle.priceDaily)}
            </span>
            <span className="text-xs font-medium text-muted-foreground">/hari</span>
          </p>
          {alternates.length ? (
            <p className="text-xs text-muted-foreground tabular-nums">
              {alternates.map((value) => formatRupiah(value)).join(" · ")}
            </p>
          ) : null}
        </div>

        <Button
          asChild
          className="h-9 w-full rounded-full bg-accent text-[0.85rem] font-semibold text-accent-foreground shadow-[0_14px_28px_-16px_var(--accent)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent-hover motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          <Link href={href}>Pesan</Link>
        </Button>
      </div>
    </article>
  )
}
