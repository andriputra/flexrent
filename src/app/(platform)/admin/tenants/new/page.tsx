import { PageHeader } from "@/components/shared/layout-parts"
import { PlatformTenantNewForm, type PlatformPlanOption } from "@/components/platform/platform-tenant-new-form"
import { requirePlatformAdmin } from "@/lib/platform"
import { listPlatformPlans } from "@/server/queries/platform"

export const metadata = { title: "Daftarkan tenant baru" }

export default async function NewPlatformTenantPage() {
  await requirePlatformAdmin()
  const plans = await listPlatformPlans()

  const options: PlatformPlanOption[] = plans.map((plan) => ({
    code: plan.code,
    name: plan.name,
    priceMonthly: plan.priceMonthly,
    maxVehicles: plan.maxVehicles,
    maxStaff: plan.maxStaff,
  }))

  return (
    <>
      <PageHeader
        title="Daftarkan tenant baru"
        description="Buatkan rental untuk klien: datanya tercatat atas nama akun mereka, Anda tetap bisa menanganinya dari konsol ini."
      />
      <PlatformTenantNewForm plans={options} />
    </>
  )
}
