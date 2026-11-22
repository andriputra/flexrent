"use client"

import { useState } from "react"
import { Bike, Car } from "lucide-react"
import { cn } from "@/lib/utils"

type Shot = { id: string; url: string; caption: string | null }

/** Galeri foto kendaraan: satu gambar besar + deretan miniature yang bisa diklik. */
export function VehicleGallery({
  shots,
  name,
  type,
}: {
  shots: Shot[]
  name: string
  type: "MOTOR" | "MOBIL"
}) {
  const PlaceholderIcon = type === "MOTOR" ? Bike : Car
  const [active, setActive] = useState(0)
  const current = shots[Math.min(active, shots.length - 1)]

  if (!current) {
    return (
      <div className="group/gallery relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl border border-ink/20 bg-ink text-ink-foreground shadow-pop">
        <div aria-hidden className="bg-ink-grid absolute inset-0 opacity-80" />
        <div
          aria-hidden
          className="absolute -top-28 -right-20 size-72 rounded-full border border-accent/20 bg-[radial-gradient(circle,rgb(245_158_11/0.18),transparent_65%)] blur-[2px]"
        />
        <div
          aria-hidden
          className="absolute -bottom-32 -left-24 size-80 rounded-full border border-white/8"
        />
        <div className="relative flex flex-col items-center gap-4 px-6 text-center">
          <span className="anim-pop flex size-20 items-center justify-center rounded-[1.5rem] border border-accent/35 bg-accent text-accent-foreground shadow-[0_18px_42px_-18px_var(--accent)] transition-transform duration-500 group-hover/gallery:-translate-y-1 motion-reduce:animate-none motion-reduce:transition-none motion-reduce:group-hover/gallery:translate-y-0">
            <PlaceholderIcon aria-hidden className="size-9" />
          </span>
          <p className="font-display text-xl font-semibold tracking-tight">{name}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      <figure className="group/gallery relative overflow-hidden rounded-2xl border border-border/70 bg-muted shadow-pop">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={current.id}
          src={current.url}
          alt={`${name}${current.caption ? ` — ${current.caption}` : ""}`}
          className="aspect-[4/3] w-full object-cover anim-fade transition-transform duration-700 ease-out group-hover/gallery:scale-[1.03] motion-reduce:animate-none motion-reduce:transition-none"
        />
        {current.caption ? (
          <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent px-4 pt-10 pb-3 text-sm text-white">
            {current.caption}
          </figcaption>
        ) : null}
      </figure>

      {shots.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {shots.map((shot, index) => (
            <button
              key={shot.id}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Lihat foto ${index + 1} dari ${shots.length}`}
              aria-current={index === Math.min(active, shots.length - 1)}
              className={cn(
                "size-16 shrink-0 overflow-hidden rounded-xl border transition-[transform,border-color,opacity,box-shadow] duration-300 motion-reduce:transition-none",
                index === Math.min(active, shots.length - 1)
                  ? "border-accent ring-2 ring-accent/40"
                  : "border-border/60 opacity-65 hover:-translate-y-0.5 hover:opacity-100 motion-reduce:hover:translate-y-0"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={shot.url} alt="" loading="lazy" className="size-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
