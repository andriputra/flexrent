"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { isReservedSlug, isValidSlug, slugify } from "@/lib/slug"
import { createTenantAction } from "@/server/actions/tenant"
import { cn } from "@/lib/utils"

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "")

function Field({
  htmlFor,
  label,
  hint,
  error,
  children,
}: {
  htmlFor: string
  label: string
  hint?: React.ReactNode
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? (
        <p className="text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function OnboardingForm({ email }: { email: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [values, setValues] = useState({
    name: "",
    slugInput: "",
    city: "",
    phone: "",
    address: "",
    email,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)

  const slug = slugify(values.slugInput || values.name)
  const slugOk = isValidSlug(slug) && !isReservedSlug(slug)

  function set(key: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setServerError(null)
    startTransition(async () => {
      const result = await createTenantAction(values)
      if (!result.ok) {
        setErrors(result.fields ?? {})
        setServerError(result.fields ? null : result.error)
        toast.error(result.error)
        return
      }
      toast.success("Rental dibuat. Masa uji 14 hari berjalan sekarang.")
      router.push("/dashboard")
    })
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {serverError ? (
        <p
          role="alert"
          className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {serverError}
        </p>
      ) : null}

      <Field
        htmlFor="name"
        label="Nama rental"
        hint="Tampil di dashboard dan halaman publik pelanggan."
        error={errors.name}
      >
        <Input
          id="name"
          value={values.name}
          onChange={(event) => set("name", event.target.value)}
          placeholder="Bandung Ride Rental"
          maxLength={60}
          required
        />
      </Field>

      <Field
        htmlFor="slugInput"
        label="Alamat halaman publik"
        error={errors.slugInput}
        hint={
          slug ? (
            <span className="flex items-center gap-1.5">
              {slugOk ? (
                <Check aria-hidden className="size-3.5 text-success" />
              ) : (
                <X aria-hidden className="size-3.5 text-danger" />
              )}
              <span className="font-mono">
                {APP_URL}/{slug}
              </span>
            </span>
          ) : (
            "Kosongkan untuk memakai nama rental sebagai alamat."
          )
        }
      >
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">/</span>
          <Input
            id="slugInput"
            value={values.slugInput}
            onChange={(event) => set("slugInput", event.target.value)}
            placeholder={slugify(values.name) || "bandung-ride"}
            maxLength={40}
            className={cn(errors.slugInput && "border-danger", slug && slugOk && "border-success/60")}
          />
        </div>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field htmlFor="city" label="Kota" error={errors.city}>
          <Input
            id="city"
            value={values.city}
            onChange={(event) => set("city", event.target.value)}
            placeholder="Bandung"
            maxLength={60}
            required
          />
        </Field>
        <Field
          htmlFor="phone"
          label="Nomor WhatsApp"
          hint="Dipakai untuk notifikasi pesanan dan tombol chat di halaman publik."
          error={errors.phone}
        >
          <Input
            id="phone"
            type="tel"
            value={values.phone}
            onChange={(event) => set("phone", event.target.value)}
            placeholder="081234567890"
            required
          />
        </Field>
      </div>

      <Field htmlFor="address" label="Alamat usaha" error={errors.address} hint="Opsional untuk saat ini.">
        <Textarea
          id="address"
          rows={2}
          value={values.address}
          onChange={(event) => set("address", event.target.value)}
          placeholder="Jl. Dago No. 12, Bandung"
          maxLength={200}
        />
      </Field>

      <Field htmlFor="email" label="Email usaha" error={errors.email} hint="Opsional, untuk tercetak di invoice.">
        <Input
          id="email"
          type="email"
          value={values.email}
          onChange={(event) => set("email", event.target.value)}
          placeholder={email}
        />
      </Field>

      <Button
        type="submit"
        className="w-full bg-accent text-accent-foreground hover:bg-accent-hover"
        disabled={pending}
      >
        {pending ? "Membuat rental…" : "Buat rental saya"}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Paket Starter aktif otomatis selama masa uji 14 hari. Upgrade kapan saja dari halaman harga.
      </p>
    </form>
  )
}
