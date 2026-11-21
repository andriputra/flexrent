import { Label } from "@/components/ui/label"
import type { ReactNode } from "react"

/** Label + isian + pesan error, dipakai semua formulir di halaman Pengaturan. */
export function Field({
  htmlFor,
  label,
  hint,
  error,
  children,
}: {
  htmlFor: string
  label: string
  hint?: ReactNode
  error?: string
  children: ReactNode
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

export function FormFeedback({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
      {message}
    </p>
  )
}
