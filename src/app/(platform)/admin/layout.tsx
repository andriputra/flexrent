import { Providers } from "@/components/shared/providers"
import { PlatformSidebar } from "@/components/platform/platform-sidebar"
import { PlatformTopBar } from "@/components/platform/platform-top-bar"
import { requirePlatformAdmin } from "@/lib/platform"

export default async function PlatformAdminLayout({ children }: { children: React.ReactNode }) {
  const context = await requirePlatformAdmin()

  return (
    <Providers>
      <div className="flex min-h-dvh bg-background">
        <PlatformSidebar userName={context.user.name} />
        <div className="flex min-w-0 flex-1 flex-col">
          <PlatformTopBar user={context.user} />
          <main className="flex-1 px-4 pb-10 pt-5 lg:px-6">
            <div className="mx-auto w-full max-w-[1280px] space-y-5">{children}</div>
          </main>
        </div>
      </div>
    </Providers>
  )
}
