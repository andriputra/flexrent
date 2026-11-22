"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { Check, Copy, Store, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FormFeedback } from "@/components/settings/form-field"
import { isReservedSlug, isValidSlug, slugify } from "@/lib/slug"
import { cn } from "@/lib/utils"
import { formatRupiah } from "@/lib/format"
import { formatDateId } from "@/lib/datetime"
import { createTenantByPlatformAction, type PlatformNewTenant } from "@/server/actions/platform"

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "")

export type PlatformPlanOption = {
  code: "STARTER" | "PRO" | "BUSINESS"
  name: string
  priceMonthly: number
  maxVehicles: number
  maxStaff: number
}

const EMPTY = {
  name: "",
  slugInput: "",
  city: "",
  phone: "",
  address: "",
  email: "",
  ownerName: "",
  ownerEmail: "",
}

export function PlatformTenantNewForm({ plans }: { plans: PlatformPlanOption[] }) {
  const [values, setValues] = useState(EMPTY)
  const [planCode, setPlanCode] = useState<string>(plans[0]?.code ?? "STARTER")
  const [withTrial, setWithTrial] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<PlatformNewTenant | null>(null)

  const slug = slugify(values.slugInput || values.name)
  const slugOk = isValidSlug(slug) && !isReservedSlug(slug)

  function set(key: keyof typeof EMPTY, value: string) {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setServerError(null)
    startTransition(async () => {
      const formData = new FormData(event.currentTarget)
      formData.set("planCode", planCode)
      formData.set("withTrial", String(withTrial))
      const response = await createTenantByPlatformAction(formData)
      if (!response.ok) {
        setErrors(response.fields ?? {})
        setServerError(response.fields ? null : response.error)
        return
      }
      setResult(response.data)
      setValues(EMPTY)
      setErrors({})
      setServerError(null)
      toast.success(`Rental ${response.data.tenantName} terdaftar.`)
    })
  }

  if (result) {
    return (
      <Card className="shadow-pop">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Check aria-hidden className="size-5 text-success" />
            {result.tenantName} terdaftar
          </CardTitle>
          <CardDescription>
            Halaman publik sudah live di{" "}
            <Link href={`/${result.slug}`} className="link-underline font-medium text-foreground">
              /{result.slug}
            </Link>
            {result.trialEndsAt ? ` · masa uji berakhir ${formatDateId(new Date(result.trialEndsAt), "d MMM yyyy")}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-3 rounded-xl border border-dashed bg-muted/40 p-4">
            <p className="text-sm font-medium">Kredensial masuk untuk pemilik</p>
            <dl className="space-y-1.5 text-sm">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <dt className="text-muted-foreground">Email</dt>
                <dd className="font-medium">{result.ownerEmail}</dd>
              </div>
              {result.accountCreated && result.initialPassword ? (
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <dt className="text-muted-foreground">Sandi awal</dt>
                  <dd className="font-mono text-[0.95rem] font-semibold select-all">{result.initialPassword}</dd>
                </div>
              ) : (
                <dd className="text-xs text-muted-foreground">
                  Email ini sudah punya akun, jadi tidak ada sandi baru. {result.ownerName} masuk seperti biasa —
                  rental {result.tenantName} langsung muncul di dashboardnya.
                </dd>
              )}
            </dl>
            {result.accountCreated && result.initialPassword ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="xs"
                  variant="outline"
                  onClick={async () => {
                    const handover = `${result.ownerEmail} / ${result.initialPassword}`
                    try {
                      await navigator.clipboard.writeText(handover)
                      toast.success("Email dan sandi tersalin.")
                    } catch {
                      toast.error("Salin otomatis diblokir browser — teks di atas bisa dipilih manual.")
                    }
                  }}
                >
                  <Copy aria-hidden className="size-3.5" />
                  Salin email &amp; sandi
                </Button>
                <p className="text-xs text-muted-foreground">
                  Sekali tampilan — kirim ke pemilik sekarang, dan minta mereka menggantinya.
                </p>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={`/admin/tenants/${result.tenantId}`}>Buka detail tenant</Link>
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setResult(null)
                setWithTrial(true)
                setPlanCode(plans[0]?.code ?? "STARTER")
              }}
            >
              Daftarkan tenant lain
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-card">
      <CardContent className="pt-6">
        <form onSubmit={submit} className="space-y-6" noValidate>
          <FormFeedback message={serverError} />

          <div className="space-y-4">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Store aria-hidden className="size-4 text-muted-foreground" />
              Identitas rental
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field htmlFor="name" label="Nama rental" error={errors.name} hint="Sama seperti isian wizard pendaftaran mandiri.">
                <Input
                  id="name"
                  name="name"
                  value={values.name}
                  onChange={(event) => set("name", event.target.value)}
                  placeholder="Bandung Ride Rental"
                  maxLength={60}
                  disabled={pending}
                  required
                />
              </Field>
              <Field htmlFor="city" label="Kota" error={errors.city}>
                <Input
                  id="city"
                  name="city"
                  value={values.city}
                  onChange={(event) => set("city", event.target.value)}
                  placeholder="Bandung"
                  maxLength={60}
                  disabled={pending}
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
                    name="slugInput"
                    value={values.slugInput}
                    onChange={(event) => set("slugInput", event.target.value)}
                    placeholder={slugify(values.name) || "bandung-ride"}
                    maxLength={40}
                    disabled={pending}
                    className={cn(errors.slugInput && "border-danger", slug && slugOk && "border-success/60")}
                  />
                </div>
              </Field>
              <Field htmlFor="phone" label="Nomor WhatsApp" error={errors.phone}>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={values.phone}
                  onChange={(event) => set("phone", event.target.value)}
                  placeholder="081234567890"
                  disabled={pending}
                  required
                />
              </Field>
              <Field htmlFor="email" label="Email usaha" error={errors.email} hint="Opsional, tercetak di invoice.">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={values.email}
                  onChange={(event) => set("email", event.target.value)}
                  placeholder="halo@rental.id"
                  disabled={pending}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field htmlFor="address" label="Alamat usaha" error={errors.address} hint="Opsional.">
                  <Textarea
                    id="address"
                    name="address"
                    rows={2}
                    value={values.address}
                    onChange={(event) => set("address", event.target.value)}
                    maxLength={200}
                    disabled={pending}
                  />
                </Field>
              </div>
            </div>
          </div>

          <div className="space-y-4 border-t pt-6">
            <p className="text-sm font-semibold">Akun pemilik</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field htmlFor="ownerName" label="Nama pemilik" error={errors.ownerName}>
                <Input
                  id="ownerName"
                  name="ownerName"
                  value={values.ownerName}
                  onChange={(event) => set("ownerName", event.target.value)}
                  placeholder="Rizky Ananda"
                  maxLength={60}
                  disabled={pending}
                  required
                />
              </Field>
              <Field
                htmlFor="ownerEmail"
                label="Email pemilik"
                error={errors.ownerEmail}
                hint="Email ini yang bisa masuk dashboard dan melihat armada rental tersebut."
              >
                <Input
                  id="ownerEmail"
                  name="ownerEmail"
                  type="email"
                  value={values.ownerEmail}
                  onChange={(event) => set("ownerEmail", event.target.value)}
                  placeholder="pemilik@rental.id"
                  disabled={pending}
                  required
                />
              </Field>
            </div>
          </div>

          <div className="space-y-4 border-t pt-6">
            <p className="text-sm font-semibold">Langganan</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {plans.map((plan) => {
                const active = plan.code === planCode
                return (
                  <button
                    key={plan.code}
                    type="button"
                    onClick={() => setPlanCode(plan.code)}
                    aria-pressed={active}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-colors",
                      active ? "border-accent bg-accent/[0.07] ring-1 ring-accent/40" : "border-border hover:bg-muted/40"
                    )}
                  >
                    <p className="text-sm font-medium">{plan.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                      {plan.priceMonthly ? `${formatRupiah(plan.priceMonthly)}/bln` : "Gratis"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {plan.maxVehicles} kendaraan · {plan.maxStaff} akun
                    </p>
                  </button>
                )
              })}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={withTrial}
                onChange={(event) => setWithTrial(event.target.checked)}
                className="size-4 rounded border-border accent-[var(--accent)]"
              />
              Mulai dengan masa uji 14 hari
            </label>
            <p className="text-xs text-muted-foreground">
              Tanpa masa uji, langganan langsung tagih penuh mulai bulan ini.
            </p>
          </div>

          <div className="flex items-center gap-3 border-t pt-6">
            <Button type="submit" disabled={pending} className="bg-accent text-accent-foreground hover:bg-accent-hover">
              {pending ? "Mendaftarkan…" : "Daftarkan tenant"}
            </Button>
            <Button asChild type="button" variant="ghost" disabled={pending}>
              <Link href="/admin/tenants">Batal</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
