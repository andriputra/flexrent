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
      <div className="flex aspect-[4/3] items-center justify-center rounded-2xl border bg-muted text-muted-foreground">
        <Car aria-hidden className="size-10" />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-2xl border bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current.url} alt={`${name}${current.caption ? ` — ${current.caption}` : ""}`} className="aspect-[4/3] w-full object-cover" />
        {current.caption ? (
          <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-4 pt-8 pb-3 text-sm text-white">
            {current.caption}
          </p>
        ) : null}
      </div>

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
                "size-16 shrink-0 overflow-hidden rounded-lg border transition-opacity motion-reduce:transition-none",
                index === Math.min(active, shots.length - 1)
                  ? "border-accent ring-2 ring-accent/40"
                  : "border-transparent opacity-70 hover:opacity-100"
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
