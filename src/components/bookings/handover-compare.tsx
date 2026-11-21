import type { FuelLevel, HandoverPhotoPosition, HandoverType } from "@prisma/client"
import { Fuel, Gauge, ImageOff } from "lucide-react"
import { formatDateTimeId } from "@/lib/datetime"
import {
  POSITION_LABEL,
  fuelDropLabel,
  fuelDropQuarters,
  fuelLabel,
  missingPhotoPositions,
  odometerDelta,
} from "@/lib/handover"
import { cn } from "@/lib/utils"

export type HandoverCard = {
  id: string
  type: HandoverType
  odometer: number | null
  fuelLevel: FuelLevel | null
  conditionNotes: string | null
  damageNotes: string | null
  createdAt: Date
  recordedBy: { name: string | null } | null
  photos: { id: string; url: string; position: HandoverPhotoPosition }[]
}

const TYPE_TITLE: Record<HandoverType, string> = {
  PICKUP: "Serah-terima",
  RETURN: "Pengembalian",
}

function PhotoGrid({ photos }: { photos: HandoverCard["photos"] }) {
  if (photos.length === 0) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ImageOff aria-hidden className="size-3.5" />
        Tidak ada foto.
      </p>
    )
  }
  return (
    <ul className="grid grid-cols-3 gap-1.5">
      {photos.map((photo) => (
        <li key={photo.id} className="space-y-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.url}
            alt={`Foto ${POSITION_LABEL[photo.position]}`}
            loading="lazy"
            className="aspect-[4/3] w-full rounded-md border object-cover"
          />
          <p className="text-[0.65rem] text-muted-foreground">{POSITION_LABEL[photo.position]}</p>
        </li>
      ))}
    </ul>
  )
}

function HandoverPanel({ card }: { card: HandoverCard }) {
  const missing = missingPhotoPositions(card.photos.map((photo) => photo.position))
  return (
    <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{TYPE_TITLE[card.type]}</p>
          <p className="text-xs text-muted-foreground">{formatDateTimeId(card.createdAt)}</p>
        </div>
        <p className="text-xs text-muted-foreground">{card.recordedBy?.name ?? "Sistem"}</p>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm tabular-nums">
        <span className="inline-flex items-center gap-1.5">
          <Gauge aria-hidden className="size-4 text-muted-foreground" />
          {card.odometer === null ? "Odometer belum dicatat" : `${card.odometer.toLocaleString("id-ID")} km`}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Fuel aria-hidden className="size-4 text-muted-foreground" />
          {fuelLabel(card.fuelLevel)}
        </span>
      </div>

      {card.conditionNotes ? (
        <p className="text-sm leading-5">{card.conditionNotes}</p>
      ) : (
        <p className="text-sm text-muted-foreground">Tidak ada catatan kondisi.</p>
      )}

      {card.damageNotes ? (
        <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          Kerusakan: {card.damageNotes}
        </p>
      ) : null}

      <PhotoGrid photos={card.photos} />
      {missing.length > 0 ? (
        <p className="text-xs text-warning">
          Foto yang belum diambil: {missing.map((position) => POSITION_LABEL[position]).join(", ")}
        </p>
      ) : null}
    </div>
  )
}

function Delta({ label, value, tone }: { label: string; value: string; tone?: "warn" | "ok" }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "truncate text-sm font-medium tabular-nums",
          tone === "warn" ? "text-warning" : tone === "ok" ? "text-success" : null
        )}
      >
        {value}
      </p>
    </div>
  )
}

/** Perbandingan kondisi sebelum/sesudah: foto, odometer, bahan bakar, dan catatan kerusakan. */
export function HandoverCompare({
  pickup,
  returned,
  lateDays: late,
}: {
  pickup: HandoverCard | null
  returned: HandoverCard | null
  lateDays: number
}) {
  if (!pickup && !returned) {
    return (
      <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
        Belum ada checklist kondisi. Isi form di kanan saat kunci diserahkan, lalu ulangi saat kendaraan kembali.
      </p>
    )
  }

  const distance = odometerDelta(pickup?.odometer, returned?.odometer)
  const dropQuarters = fuelDropQuarters(pickup?.fuelLevel, returned?.fuelLevel)

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        {pickup ? (
          <HandoverPanel card={pickup} />
        ) : (
          <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            Checklist serah-terima belum diisi.
          </p>
        )}
        {returned ? (
          <HandoverPanel card={returned} />
        ) : (
          <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            Checklist pengembalian belum diisi.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-xl border bg-card px-4 py-3 sm:grid-cols-4">
        <Delta
          label="Jarak tempuh"
          value={distance === null ? "Menunggu odometer" : `${distance.toLocaleString("id-ID")} km`}
        />
        <Delta
          label="Bahan bakar"
          value={dropQuarters > 0 ? (fuelDropLabel(dropQuarters) ?? "") : "Tidak berkurang"}
          tone={dropQuarters > 0 ? "warn" : "ok"}
        />
        <Delta
          label="Keterlambatan"
          value={late > 0 ? `${late} hari` : "Tepat waktu"}
          tone={late > 0 ? "warn" : "ok"}
        />
        <Delta
          label="Foto kondisi"
          value={`${pickup?.photos.length ?? 0} + ${returned?.photos.length ?? 0}`}
        />
      </div>
    </div>
  )
}
