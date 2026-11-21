"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { CalendarDays, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { buildCatalogHref } from "@/components/public/query-nav"

const TYPES = [
  { value: "", label: "Semua" },
  { value: "motor", label: "Motor" },
  { value: "mobil", label: "Mobil" },
] as const

/** Hero pencarian: tanggal ambil, tanggal kembali, jenis kendaraan. */
export function AvailabilitySearch({
  slug,
  initial,
  today,
}: {
  slug: string
  initial: { ambil: string; kembali: string; jenis: string }
  today: string
}) {
  const router = useRouter()
  const [ambil, setAmbil] = useState(initial.ambil)
  const [kembali, setKembali] = useState(initial.kembali)
  const [jenis, setJenis] = useState(initial.jenis)

  const datesIncomplete = Boolean(ambil) !== Boolean(kembali)
  const rangeInvalid = Boolean(ambil) && Boolean(kembali) && kembali <= ambil

  function submit(event: React.FormEvent) {
    event.preventDefault()
    router.push(
      buildCatalogHref(slug, {
        ambil: rangeInvalid ? "" : ambil,
        kembali: rangeInvalid ? "" : kembali,
        jenis: jenis as "motor" | "mobil" | "",
      })
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-card p-4 shadow-card sm:p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ambil" className="flex items-center gap-1.5">
            <CalendarDays aria-hidden className="size-3.5 text-muted-foreground" />
            Tanggal ambil
          </Label>
          <Input
            id="ambil"
            type="date"
            min={today}
            value={ambil}
            onChange={(event) => setAmbil(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="kembali" className="flex items-center gap-1.5">
            <CalendarDays aria-hidden className="size-3.5 text-muted-foreground" />
            Tanggal kembali
          </Label>
          <Input
            id="kembali"
            type="date"
            min={ambil || today}
            value={kembali}
            onChange={(event) => setKembali(event.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Jenis</span>
        <div className="flex gap-1.5" role="group" aria-label="Jenis kendaraan">
          {TYPES.map((option) => {
            const active = jenis === option.value
            return (
              <button
                key={option.label}
                type="button"
                aria-pressed={active}
                onClick={() => setJenis(option.value)}
                className={
                  active
                    ? "rounded-xl bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground transition-colors duration-150"
                    : "rounded-xl border bg-background px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground"
                }
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      {rangeInvalid ? (
        <p className="text-sm text-danger" role="alert">
          Tanggal kembali harus setelah tanggal ambil.
        </p>
      ) : datesIncomplete ? (
        <p className="text-sm text-muted-foreground">
          Isi dua-duanya supaya kami bisa menyaring kendaraan yang sedang terisi.
        </p>
      ) : null}

      <Button
        type="submit"
        className="w-full bg-accent text-accent-foreground hover:bg-accent-hover sm:w-auto"
      >
        <Search aria-hidden />
        Cek ketersediaan
      </Button>
    </form>
  )
}
