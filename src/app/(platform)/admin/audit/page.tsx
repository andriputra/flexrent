import { ListChecks } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState, PageHeader } from "@/components/shared/layout-parts"
import { formatDateId } from "@/lib/datetime"
import { requirePlatformAdmin } from "@/lib/platform"
import { listPlatformAuditLogs } from "@/server/queries/platform"

export default async function PlatformAuditPage() {
  await requirePlatformAdmin()
  const logs = await listPlatformAuditLogs()

  return (
    <>
      <PageHeader title="Audit log" description="Riwayat perubahan administratif platform yang dicatat bersama aktornya." />
      <Card className="shadow-card">
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <EmptyState icon={<ListChecks aria-hidden />} title="Belum ada aktivitas" description="Perubahan status tenant dan paket akan tercatat di sini." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-border/70 bg-muted/40 text-xs text-muted-foreground"><tr><th className="px-4 py-3 font-medium">Waktu</th><th className="px-4 py-3 font-medium">Aksi</th><th className="px-4 py-3 font-medium">Target</th><th className="px-4 py-3 font-medium">Tenant</th><th className="px-4 py-3 font-medium">Aktor</th></tr></thead>
                <tbody className="divide-y divide-border/60">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/25">
                      <td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums text-muted-foreground">{formatDateId(log.createdAt, "d MMM yyyy HH:mm")}</td>
                      <td className="px-4 py-3"><Badge variant="outline">{log.action}</Badge></td>
                      <td className="px-4 py-3"><span className="font-medium">{log.entityType}</span>{log.entityId ? <span className="ml-1 text-xs text-muted-foreground">{log.entityId.slice(0, 10)}…</span> : null}</td>
                      <td className="px-4 py-3 text-muted-foreground">{log.tenant?.name ?? "Platform"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{log.actor.name || log.actor.email || "Akun"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
