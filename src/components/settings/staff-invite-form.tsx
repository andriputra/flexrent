"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { inviteStaffAction } from "@/server/actions/settings"
import { Field, FormFeedback } from "./form-field"

export function StaffInviteForm({
  readOnly,
  slotsLeft,
  emailConfigured,
}: {
  readOnly: boolean
  /** Sisa kursi staf paket; `null` kalau paket belum menentukan batas. */
  slotsLeft: number | null
  emailConfigured: boolean
}) {
  const router = useRouter()
  const [values, setValues] = useState({ email: "", role: "STAFF", jobTitle: "" })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const blocked = readOnly || (slotsLeft !== null && slotsLeft <= 0)

  function set(key: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setServerError(null)
    startTransition(async () => {
      const result = await inviteStaffAction(values)
      if (!result.ok) {
        setErrors(result.fields ?? {})
        setServerError(result.fields ? null : result.error)
        toast.error(result.error)
        return
      }
      setValues({ email: "", role: "STAFF", jobTitle: "" })
      setErrors({})
      if (!result.data.sentEmail) {
        toast.warning(
          result.data.joined
            ? "Staf sudah terhubung ke rental. Email tidak terkirim karena SMTP belum dipasang."
            : "Undanan tersimpan, tapi email belum bisa dikirim (SMTP_HOST kosong)."
        )
      } else {
        toast.success(`Undangan dikirim ke ${result.data.email}.`)
      }
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <FormFeedback message={serverError} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field htmlFor="staffEmail" label="Email staf" error={errors.email}>
          <Input
            id="staffEmail"
            type="email"
            value={values.email}
            onChange={(event) => set("email", event.target.value)}
            placeholder="staf@rental.id"
            disabled={blocked || pending}
            required
          />
        </Field>

        <Field htmlFor="staffRole" label="Peran" error={errors.role} hint="Admin bisa mengubah pengaturan dan langganan.">
          <Select value={values.role} onValueChange={(value) => set("role", value)} disabled={blocked || pending}>
            <SelectTrigger id="staffRole" className="w-full">
              <SelectValue placeholder="Pilih peran" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="STAFF">Staf</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field htmlFor="staffJob" label="Jabatan" error={errors.jobTitle} hint='Opsional, mis. "Front office".'>
        <Input
          id="staffJob"
          value={values.jobTitle}
          onChange={(event) => set("jobTitle", event.target.value)}
          maxLength={60}
          disabled={blocked || pending}
        />
      </Field>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={blocked || pending}>
          <UserPlus aria-hidden />
          {pending ? "Mengirim undangan…" : "Undang staf"}
        </Button>
        {slotsLeft !== null ? (
          <p className="text-sm text-muted-foreground">
            {slotsLeft > 0 ? `${slotsLeft} kursi staf tersisa` : "Kursi staf paket ini penuh — upgrade paket dulu."}
          </p>
        ) : null}
      </div>

      {!emailConfigured ? (
        <p className="text-xs text-muted-foreground">
          SMTP belum dipasang, jadi undangannya tidak terkirim dan hanya tercatat di dashboard. Staf tetap bisa
          masuk memakai email ini begitu sandinya dibuat:{" "}
          <code className="rounded bg-muted px-1 py-0.5">{`npm run account:password -- email@staf.id SANDI_BARU`}</code>
        </p>
      ) : null}
    </form>
  )
}
