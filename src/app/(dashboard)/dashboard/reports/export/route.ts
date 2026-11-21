import { addDays, formatDateId, toDayKey } from "@/lib/datetime"
import { csvFilename, toCsv } from "@/lib/csv"
import { requireTenant } from "@/lib/tenant"
import { vehicleRevenueCsv } from "@/lib/reports"
import { getVehicleRevenue, parseReportRange } from "@/server/queries/reports"

export const dynamic = "force-dynamic"

/** Ekspor CSV laporan pendapatan per kendaraan — isi tabel di /dashboard/reports. */
export async function GET(request: Request) {
  const context = await requireTenant()
  const query = new URL(request.url).searchParams
  const range = parseReportRange({
    dari: query.get("dari") ?? undefined,
    sampai: query.get("sampai") ?? undefined,
  })

  const report = await getVehicleRevenue(context.tenant.id, range.start, range.end)

  const last = addDays(range.end, -1)
  const label = `${formatDateId(range.start, "d MMM yyyy")} – ${formatDateId(last, "d MMM yyyy")}`
  const body = toCsv(vehicleRevenueCsv(report, label, context.tenant.name))

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${csvFilename(
        `pendapatan-${toDayKey(range.start)}-${toDayKey(last)}`
      )}"`,
      "Cache-Control": "no-store",
    },
  })
}
