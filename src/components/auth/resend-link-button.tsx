"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { signInWithEmailAction } from "@/server/actions/auth"

export function ResendLinkButton({ email, isRegister }: { email: string; isRegister: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  if (!email) return null

  return (
    <Button
      variant="outline"
      className="w-full"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await signInWithEmailAction(email, isRegister ? "/onboarding" : "/dashboard")
          if (!result.ok) {
            toast.error(result.error)
            return
          }
          toast.success("Tautan dikirim ulang.")
          router.refresh()
        })
      }
    >
      {pending ? "Mengirim…" : "Kirim ulang tautan"}
    </Button>
  )
}
