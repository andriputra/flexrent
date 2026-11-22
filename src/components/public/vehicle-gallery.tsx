"use client"

import { useState } from "react"
import { Car } from "lucide-react"
import { cn } from "@/lib/utils"

type Shot = { id: string; url: string; caption: string | null }

/** Galeri foto kendaraan: satu gambar besar + deretan miniature yang bisa diklik. */
export function VehicleGallery({ shots, name }: { shots: Shot[]; name: string }) {
  const [active, setActive] = useState(0)
  const current = shots[Math.min(active, shots.length - 1)]

  if (!current) {
    return (
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl border border-border/70 bg-muted shadow-card">
        <div aria-hidden className="bg-grid absolute inset-0 opacity-70" />
        <span className="flex size-14 items-center justify-center rounded-2xl border border-border/70 bg-card/80 text-muted-foreground shadow-card backdrop-blur-sm">
          <Car aria-hidden className="size-7" />
        </span>
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
