"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { isReservedSlug, isValidSlug, slugify } from "@/lib/slug"
import { updateTenantProfileAction } from "@/server/actions/settings"
import { cn } from "@/lib/utils"
import { Field, FormFeedback } from "./form-field"

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "")

export type ProfileValues = {
  name: string
  slugInput: string
  city: string
  phone: string
  address: string
  email: string
  tagline: string
}

export function ProfileForm({ initial, readOnly }: { initial: ProfileValues; readOnly: boolean }) {
  const router = useRouter()
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const slug = slugify(values.slugInput || values.name)
  const slugOk = isValidSlug(slug) && !isReservedSlug(slug)

  function set(key: keyof ProfileValues, value: string) {
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
      const result = await updateTenantProfileAction(values)
      if (!result.ok) {
        setErrors(result.fields ?? {})
        setServerError(result.fields ? null : result.error)
        toast.error(result.error)
        return
      }
      toast.success("Profil rental disimpan.")
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <FormFeedback message={serverError} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field htmlFor="name" label="Nama rental" error={errors.name}>
          <Input
            id="name"
            value={values.name}
            onChange={(event) => set("name", event.target.value)}
            maxLength={60}
            disabled={readOnly || pending}
            required
          />
        </Field>

        <Field htmlFor="city" label="Kota" error={errors.city}>
          <Input
            id="city"
            value={values.city}
            onChange={(event) => set("city", event.target.value)}
            maxLength={60}
            disabled={readOnly || pending}
            required
          />
        </Field>

        <Field htmlFor="tagline" label="Tagline" error={errors.tagline}>
          <Input
            id="tagline"
            value={values.tagline}
            onChange={(event) => set("tagline", event.target.value)}
            maxLength={120}
            placeholder="Sewa motor harian tanpa ribet"
            disabled={readOnly || pending}
          />
        </Field>

        <Field
          htmlFor="slugInput"
          label="Alamat halaman publik"
          error={errors.slugInput}
          hint={
            slug ? (
              <span className="flex items-center gap-1.5">
                {slugOk ? <Check aria-hidden className="size-3.5 text-success" /> : <X aria-hidden className="size-3.5 text-danger" />}
                <span className="font-mono">
                  {APP_URL}/{slug}
                </span>
              </span>
            ) : (
              "Kosong = memakai nama rental."
            )
          }
        >
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">/</span>
            <Input
              id="slugInput"
              value={values.slugInput}
              onChange={(event) => set("slugInput", event.target.value)}
              placeholder={slugify(values.name)}
              maxLength={40}
              disabled={readOnly || pending}
              className={cn(errors.slugInput && "border-danger", slug && slugOk && "border-success/60")}
            />
          </div>
        </Field>
      </div>

      <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
        <Field htmlFor="phone" label="Nomor WhatsApp" error={errors.phone}>
          <Input
            id="phone"
            type="tel"
            value={values.phone}
            onChange={(event) => set("phone", event.target.value)}
            placeholder="081234567890"
            disabled={readOnly || pending}
            required
          />
        </Field>

        <Field htmlFor="email" label="Email usaha" error={errors.email}>
          <Input
            id="email"
            type="email"
            value={values.email}
            onChange={(event) => set("email", event.target.value)}
            placeholder="halo@rental.id"
            disabled={readOnly || pending}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field htmlFor="address" label="Alamat usaha" error={errors.address}>
            <Textarea
              id="address"
              rows={2}
              value={values.address}
              onChange={(event) => set("address", event.target.value)}
              maxLength={200}
              disabled={readOnly || pending}
            />
          </Field>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={readOnly || pending}
          className="bg-accent text-accent-foreground hover:bg-accent-hover"
        >
          {pending ? "Menyimpan…" : "Simpan profil"}
        </Button>
        {readOnly ? <p className="text-xs text-muted-foreground">Dashboard sedang hanya-baca.</p> : null}
      </div>
    </form>
  )
}
