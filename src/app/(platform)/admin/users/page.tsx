import Link from "next/link"
import { Search, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { EmptyState, PageHeader } from "@/components/shared/layout-parts"
import { formatDateId } from "@/lib/datetime"
import { requirePlatformAdmin } from "@/lib/platform"
import { listPlatformUsers } from "@/server/queries/platform"

export default async function PlatformUsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requirePlatformAdmin()
  const query = await searchParams
  const search = typeof query.q === "string" ? query.q : ""
  const users = await listPlatformUsers(search)

  return (
    <>
      <PageHeader title="Akun rental" description="Lihat akun pengguna dan tenant yang mereka kelola di seluruh platform." />
      <form className="flex flex-col gap-2 sm:flex-row" method="get">
        <div className="relative min-w-0 flex-1"><Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" /><Input name="q" defaultValue={search} placeholder="Cari nama atau email…" className="pl-9" /></div>
        <Button type="submit" variant="outline">Cari akun</Button>
        {search ? <Button asChild type="button" variant="ghost"><Link href="/admin/users">Reset</Link></Button> : null}
      </form>
      <Card className="shadow-card"><CardContent className="p-0">
        {users.length === 0 ? <EmptyState icon={<Users aria-hidden />} title="Akun tidak ditemukan" description="Coba kata kunci lain atau kosongkan filter pencarian." /> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm">
            <thead className="border-b border-border/70 bg-muted/40 text-xs text-muted-foreground"><tr><th className="px-4 py-3 font-medium">Akun</th><th className="px-4 py-3 font-medium">Akses platform</th><th className="px-4 py-3 font-medium">Tenant aktif</th><th className="px-4 py-3 font-medium">Terdaftar</th></tr></thead>
            <tbody className="divide-y divide-border/60">{users.map((user) => <tr key={user.id} className="hover:bg-muted/25">
              <td className="px-4 py-3"><p className="font-medium">{user.name || "Tanpa nama"}</p><p className="text-xs text-muted-foreground">{user.email}</p></td>
              <td className="px-4 py-3">{user.isPlatformAdmin ? <Badge>Super-admin</Badge> : <span className="text-xs text-muted-foreground">Tidak ada</span>}</td>
              <td className="space-y-1 px-4 py-3">{user.memberships.length ? user.memberships.map((membership) => <div key={membership.tenant.id} className="flex items-center gap-2"><Link href={`/admin/tenants/${membership.tenant.id}`} className="font-medium hover:text-primary">{membership.tenant.name}</Link><Badge variant="outline">{membership.role}</Badge>{!membership.tenant.isActive ? <Badge variant="destructive">Suspend</Badge> : null}</div>) : <span className="text-xs text-muted-foreground">Belum terhubung tenant</span>}</td>
              <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">{formatDateId(user.createdAt, "d MMM yyyy")}</td>
            </tr>)}</tbody>
          </table></div>
        )}
      </CardContent></Card>
    </>
  )
}
