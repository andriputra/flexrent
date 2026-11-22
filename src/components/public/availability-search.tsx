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
    <form
      onSubmit={submit}
      className="reveal relative space-y-4 rounded-2xl border border-border/70 bg-card p-4 shadow-pop ring-1 ring-accent/15 sm:p-5"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-accent/65 to-transparent"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -top-20 -right-16 size-44 rounded-full bg-[radial-gradient(circle,rgb(245_158_11/0.16),transparent_70%)] blur-2xl"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label
            htmlFor="ambil"
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
          >
            <CalendarDays aria-hidden className="size-3.5" />
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
          <Label
            htmlFor="kembali"
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
          >
            <CalendarDays aria-hidden className="size-3.5" />
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

      <div className="flex flex-wrap items-center gap-2.5">
        <span className="text-xs font-medium text-muted-foreground">Jenis</span>
        <div
          role="group"
          aria-label="Jenis kendaraan"
          className="inline-flex gap-1 rounded-full border border-border/70 bg-muted/50 p-1"
        >
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
                    ? "rounded-full bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground shadow-[0_8px_18px_-10px_var(--primary)] transition-colors duration-200"
                    : "rounded-full px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
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
        className="h-10 w-full rounded-full bg-accent px-5 text-[0.9rem] font-semibold text-accent-foreground shadow-[0_16px_34px_-16px_var(--accent)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent-hover sm:w-auto"
      >
        <Search aria-hidden />
        Cek ketersediaan
      </Button>
    </form>
  )
}
