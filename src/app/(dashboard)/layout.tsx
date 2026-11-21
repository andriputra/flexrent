import { requireTenant } from "@/lib/tenant"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { DashboardTopBar } from "@/components/dashboard/dashboard-top-bar"
import { DashboardBottomNav } from "@/components/dashboard/dashboard-bottom-nav"
import { SubscriptionBanner } from "@/components/dashboard/subscription-banner"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const context = await requireTenant()

  return (
    <div className="flex min-h-dvh bg-background">
      <DashboardSidebar
        tenantName={context.tenant.name}
        tenantCity={context.tenant.city}
        publicUrl={`/${context.tenant.slug}`}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardTopBar
          tenantName={context.tenant.name}
          tenantId={context.tenant.id}
          memberships={context.memberships}
          user={context.user}
          role={context.role}
        />
        <main className="flex-1 px-4 pb-24 pt-5 lg:px-6 lg:pb-10">
          <div className="mx-auto w-full max-w-[1200px] space-y-5">
            <SubscriptionBanner context={context} />
            {children}
          </div>
        </main>
      </div>
      <DashboardBottomNav publicUrl={`/${context.tenant.slug}`} />
    </div>
  )
}
