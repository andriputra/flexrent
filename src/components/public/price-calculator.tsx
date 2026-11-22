"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowRight, CalendarDays, Clock, Loader2, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useVehicleQuote } from "@/components/public/use-vehicle-quote"
import { formatRupiah } from "@/lib/format"
import { toDayKey } from "@/lib/datetime"

/**
 * Kalkulator harga langsung. Angka tidak dihitung di klien: setiap perubahan
 * tanggal menanyakan quoteVehicleAction supaya tarif yang tampil = tarif di database.
 */
export function PriceCalculator({
  slug,
  vehicleId,
  hasDriver,
  initial,
}: {
  slug: string
  vehicleId: string
  hasDriver: boolean
  initial: { ambil: string; kembali: string }
}) {
  const today = toDayKey(new Date())
  const [startDay, setStartDay] = useState(initial.ambil || today)
  const [startTime, setStartTime] = useState("09:00")
  const [returnDay, setReturnDay] = useState(initial.kembali || "")
  const [returnTime, setReturnTime] = useState("09:00")
  const [withDriver, setWithDriver] = useState(false)
  const { quote, error, computing } = useVehicleQuote({
    slug,
    vehicleId,
    startDay,
    startTime,
    returnDay,
    returnTime,
    withDriver,
  })

  const wizardHref = `/${slug}/pesan/${vehicleId}?ambil=${startDay}&kembali=${returnDay}&jamAmbil=${startTime}&jamKembali=${returnTime}&sopir=${withDriver ? 1 : 0}`

  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-2 gap-2.5">
        <div className="space-y-1.5">
          <Label
            htmlFor="calc-start"
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
          >
            <CalendarDays aria-hidden className="size-3.5" />
            Tanggal ambil
          </Label>
          <Input
            id="calc-start"
            type="date"
            min={today}
            value={startDay}
            onChange={(event) => setStartDay(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="calc-start-time" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Clock aria-hidden className="size-3.5" />
            Jam
          </Label>
          <Input id="calc-start-time" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label
            htmlFor="calc-end"
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
          >
            <CalendarDays aria-hidden className="size-3.5" />
            Tanggal kembali
          </Label>
          <Input
            id="calc-end"
            type="date"
            min={startDay || today}
            value={returnDay}
            onChange={(event) => {
              setReturnDay(event.target.value)
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="calc-end-time" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Clock aria-hidden className="size-3.5" />
            Jam
          </Label>
          <Input id="calc-end-time" type="time" value={returnTime} onChange={(event) => setReturnTime(event.target.value)} />
        </div>
      </div>

      {hasDriver ? (
        <fieldset className="space-y-1.5">
          <legend className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <UserRound aria-hidden className="size-3.5" />
            Layanan sopir
          </legend>
          <div
            role="radiogroup"
            aria-label="Layanan sopir"
            className="inline-flex w-full gap-1 rounded-full border border-border/70 bg-muted/50 p-1"
          >
            {[
              { label: "Tanpa sopir", value: false },
              { label: "Dengan sopir", value: true },
            ].map((option) => (
              <button
                key={option.label}
                type="button"
                role="radio"
                aria-checked={withDriver === option.value}
                onClick={() => setWithDriver(option.value)}
                className={
                  withDriver === option.value
                    ? "flex-1 rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-[0_8px_18px_-10px_var(--primary)] transition-colors duration-200"
                    : "flex-1 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
                }
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <ul className="space-y-1 rounded-xl border border-border/60 bg-muted/30 p-3 text-sm">
        {quote ? (
          <>
            <Row label={`Sewa ${quote.rental.scheme}`} value={formatRupiah(quote.rentalAmount)} />
            {quote.driverAmount ? <Row label="Sopir" value={formatRupiah(quote.driverAmount)} /> : null}
            <li className="flex justify-between text-muted-foreground">
              <span>Deposit (kembali bila lancar)</span>
              <span className="tabular-nums">{formatRupiah(quote.depositAmount)}</span>
            </li>
            <li className="mt-1.5 flex items-baseline justify-between gap-3 border-t border-border/60 pt-2.5 font-semibold">
              <span>Total bayar</span>
              <span className="text-[1.15rem] leading-6 tabular-nums">{formatRupiah(quote.totalAmount)}</span>
            </li>
          </>
        ) : (
          <li className="flex items-center gap-2 text-muted-foreground">
            <Loader2 aria-hidden className={`size-4 ${computing ? "animate-spin" : ""}`} />
            Pilih tanggal ambil dan kembali untuk melihat total.
          </li>
        )}
      </ul>

      <Button
        asChild
        className="h-10 w-full rounded-full bg-accent px-5 text-[0.9rem] font-semibold text-accent-foreground shadow-[0_16px_34px_-16px_var(--accent)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent-hover motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      >
        <Link href={wizardHref}>
          Lanjut isi data penyewaan
          <ArrowRight aria-hidden data-icon="inline-end" />
        </Link>
      </Button>
      <p className="text-xs leading-5 text-muted-foreground">
        Harga dihitung otomatis dari tarif harian, mingguan, dan bulanan — kombinasi termurah yang dipakai.
      </p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right tabular-nums">{value}</span>
    </li>
  )
}
