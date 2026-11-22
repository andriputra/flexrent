"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { KeyRound, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/** Menuju halaman status: kode diletakkan di path, nomor WhatsApp di query. */
export function BookingLookupForm({
  slug,
  initialCode = "",
  initialPhone = "",
}: {
  slug: string
  initialCode?: string
  initialPhone?: string
}) {
  const router = useRouter()
  const [code, setCode] = useState(initialCode)
  const [phone, setPhone] = useState(initialPhone)
  const [error, setError] = useState("")

  return (
    <form
      className="reveal space-y-4 rounded-2xl border border-border/70 bg-card p-4 shadow-pop sm:p-5"
      onSubmit={(event) => {
        event.preventDefault()
        const cleanCode = code.trim().toUpperCase()
        const cleanPhone = phone.trim()
        if (cleanCode.length < 7 || cleanPhone.replace(/\D/g, "").length < 9) {
          setError("Isi kode booking dan nomor WhatsApp dengan benar.")
          return
        }
        setError("")
        router.push(`/${slug}/booking/${encodeURIComponent(cleanCode)}?phone=${encodeURIComponent(cleanPhone)}`)
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="code" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <KeyRound aria-hidden className="size-3.5" />
          Kode booking
        </Label>
        <Input
          id="code"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          autoComplete="off"
          placeholder="BR-2611-0007"
          className="font-medium tracking-wide tabular-nums"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="phone" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Phone aria-hidden className="size-3.5" />
          Nomor WhatsApp saat memesan
        </Label>
        <Input
          id="phone"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          inputMode="tel"
          autoComplete="tel"
          placeholder="081234567890"
          className="tabular-nums"
          required
        />
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        className="h-10 w-full rounded-full bg-accent px-5 text-[0.9rem] font-semibold text-accent-foreground shadow-[0_16px_34px_-16px_var(--accent)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent-hover motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      >
        <KeyRound aria-hidden />
        Cari pesanan saya
      </Button>
    </form>
  )
}
