"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { termsList } from "@/lib/terms"
import { updateTermsAction } from "@/server/actions/settings"
import { Field, FormFeedback } from "./form-field"

export function TermsForm({ initial, readOnly }: { initial: string; readOnly: boolean }) {
  const router = useRouter()
  const [value, setValue] = useState(initial)
  const [serverError, setServerError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const preview = termsList(value || null)

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setServerError(null)
    const formData = new FormData()
    formData.set("terms", value)
    startTransition(async () => {
      const result = await updateTermsAction(formData)
      if (!result.ok) {
        setServerError(result.error)
        toast.error(result.error)
        return
      }
      toast.success(`Syarat sewa disimpan (${result.data.count} butir).`)
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <FormFeedback message={serverError} />

      <Field htmlFor="terms" label="Daftar syarat" hint="Satu baris = satu butir.">
        <Textarea
          id="terms"
          rows={6}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          maxLength={2000}
          disabled={readOnly || pending}
        />
      </Field>

      <div className="space-y-2 rounded-xl border bg-muted/40 px-4 py-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Pratinjau di halaman publik</p>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          {preview.map((term) => (
            <li key={term}>{term}</li>
          ))}
        </ol>
        {value.trim() ? null : (
          <p className="text-xs text-muted-foreground">Masih kosong — di atas syarat bawaan Flexrent.</p>
        )}
      </div>

      <Button
        type="submit"
        disabled={readOnly || pending}
        className="bg-accent text-accent-foreground hover:bg-accent-hover"
      >
        {pending ? "Menyimpan…" : "Simpan syarat sewa"}
      </Button>
    </form>
  )
}
