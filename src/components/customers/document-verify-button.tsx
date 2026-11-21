"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ShieldCheck, ShieldX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { setDocumentVerifiedAction } from "@/server/actions/customers"

/** Tombol setuju/cabut persetujuan satu dokumen KTP atau SIM. */
export function DocumentVerifyButton({
  documentId,
  isVerified,
  fileName,
  readOnly = false,
}: {
  documentId: string
  isVerified: boolean
  fileName: string
  readOnly?: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function toggle() {
    const payload = new FormData()
    payload.set("documentId", documentId)
    payload.set("isVerified", isVerified ? "false" : "true")

    startTransition(async () => {
      const result = await setDocumentVerifiedAction(payload)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(
        result.data.isVerified
          ? `${result.data.fileName} terverifikasi.`
          : `Verifikasi ${result.data.fileName} dicabut.`
      )
      router.refresh()
    })
  }

  return (
    <Button
      variant={isVerified ? "outline" : "secondary"}
      size="xs"
      disabled={pending || readOnly}
      onClick={toggle}
      title={fileName}
    >
      {isVerified ? <ShieldX aria-hidden /> : <ShieldCheck aria-hidden />}
      {isVerified ? "Cabut" : "Terverifikasi"}
    </Button>
  )
}
