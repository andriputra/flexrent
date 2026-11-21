"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { KeyRound } from "lucide-react"
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
      className="space-y-4 rounded-2xl border bg-card p-4 shadow-card sm:p-5"
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
      <div className="space-y-1">
        <Label htmlFor="code">Kode booking</Label>
        <Input
          id="code"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          autoComplete="off"
          placeholder="BR-2611-0007"
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="phone">Nomor WhatsApp saat memesan</Label>
        <Input
          id="phone"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          inputMode="tel"
          autoComplete="tel"
          placeholder="081234567890"
          required
        />
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent-hover">
        <KeyRound aria-hidden />
        Cari pesanan saya
      </Button>
    </form>
  )
}
