"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useConfirmAction } from "@/components/shared/confirm-action"
import { setPlatformTenantActiveAction } from "@/server/actions/platform"

function payload(tenantId: string, active: boolean) {
  const formData = new FormData()
  formData.set("tenantId", tenantId)
  formData.set("active", String(active))
  return formData
}

export function PlatformTenantStatusButton({
  tenantId,
  tenantName,
  active,
}: {
  tenantId: string
  tenantName: string
  active: boolean
}) {
  const router = useRouter()
  const { ask, dialog } = useConfirmAction()

  function changeStatus() {
    ask({
      title: active ? "Suspend tenant ini?" : "Aktifkan tenant ini?",
      description: active
        ? `${tenantName} tidak bisa masuk dashboard dan halaman publiknya akan berhenti sementara.`
        : `${tenantName} bisa kembali masuk dashboard dan menerima pesanan sesuai status langganannya.`,
      confirmLabel: active ? "Suspend tenant" : "Aktifkan tenant",
      destructive: active,
      successMessage: active ? "Tenant disuspend." : "Tenant diaktifkan kembali.",
      run: () => setPlatformTenantActiveAction(payload(tenantId, !active)),
      onSuccess: () => router.refresh(),
    })
  }

  return (
    <>
      <Button size="sm" variant={active ? "outline" : "default"} onClick={changeStatus}>
        {active ? "Suspend" : "Aktifkan"}
      </Button>
      {dialog}
    </>
  )
}
