"use client"

import { useState, useTransition } from "react"
import { CreditCard, Loader2, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { PaymentKindKey } from "@/lib/payments/provider"
import { createCheckoutAction } from "@/server/actions/payments"

/** Membuka halaman bayar Midtrans. Nomor WhatsApp ikut dikirim sebagai bukti otoritas. */
export function BookingPayButton({
  slug,
  code,
  phone,
  kind,
  label,
  hint,
  variant = "accent",
}: {
  slug: string
  code: string
  phone: string
  kind: PaymentKindKey
  label: string
  hint?: string
  variant?: "accent" | "outline"
}) {
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  return (
    <div className="space-y-2">
      <Button
        variant={variant === "outline" ? "outline" : "default"}
        className={
          variant === "outline"
            ? "h-10 w-full rounded-full transition-transform duration-300 hover:-translate-y-0.5 motion-reduce:transition-none"
            : "h-10 w-full rounded-full bg-accent px-5 text-[0.9rem] font-semibold text-accent-foreground shadow-[0_16px_34px_-16px_var(--accent)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent-hover motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        }
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError("")
            const result = await createCheckoutAction({ slug, code, phone, kind })
            if (!result.ok) {
              setError(result.error)
              return
            }
            window.location.assign(result.data.redirectUrl)
          })
        }
      >
        {pending ? <Loader2 aria-hidden className="motion-safe:animate-spin" /> : <CreditCard aria-hidden />}
        {pending ? "Membuka halaman bayar…" : label}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {hint ? (
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          {hint}
        </p>
      ) : null}
    </div>
  )
}
