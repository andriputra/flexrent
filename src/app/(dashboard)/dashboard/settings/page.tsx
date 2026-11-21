import Link from "next/link"
import { Building2, Clock, Eye, Receipt, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/layout-parts"
import { LogoForm } from "@/components/settings/logo-form"
import { OpeningHoursForm } from "@/components/settings/opening-hours-form"
import { ProfileForm } from "@/components/settings/profile-form"
import { StaffInviteForm } from "@/components/settings/staff-invite-form"
import { TermsForm } from "@/components/settings/terms-form"
import { defaultOpeningHours, dayLabel } from "@/lib/opening-hours"
import { isEmailConfigured } from "@/lib/email"
import { formatRupiah } from "@/lib/format"
import { termsList } from "@/lib/terms"
import { requireTenant } from "@/lib/tenant"
import { getSettingsOverview } from "@/server/queries/settings"

export const metadata = { title: "Pengaturan" }

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Pemilik",
  ADMIN: "Admin",
  STAFF: "Staf",
}

export default async function SettingsPage() {
  const context = await requireTenant()
  const overview = await getSettingsOverview(context.tenant.id)
  const { tenant } = overview

  const readOnly = !context.canManage || context.isReadOnly
  const blockedReason = !context.canManage
    ? "Hanya pemilik atau admin yang bisa mengubah pengaturan ini."
    : context.readOnlyReason

  const hoursAreDefault = overview.openingHours.length === 0
  const hours = hoursAreDefault ? defaultOpeningHours() : overview.openingHours
  const terms = termsList(tenant.terms)
  const slotsLeft = overview.staffLimit === null ? null : overview.staffLimit - overview.staff.length

  return (
    <>
      <PageHeader
        title="Pengaturan rental"
        description="Identitas yang tampil di halaman publik, jam operasional, syarat sewa, dan staf yang bisa membuka dashboard."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={`/${tenant.slug}`} target="_blank" rel="noreferrer">
              <Eye aria-hidden />
              Lihat halaman publik
            </Link>
          </Button>
        }
      />

      {!context.canManage ? (
        <Card className="shadow-card">
          <CardContent className="px-5 py-4 text-sm text-muted-foreground">{blockedReason}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <Card className="shadow-card">
            <CardHeader className="gap-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 aria-hidden className="size-4 text-muted-foreground" />
                Profil rental
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Nama, kota, dan kontak dipakai di dashboard, halaman publik, dan tagihan langganan.
              </p>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <ProfileForm
                readOnly={readOnly}
                initial={{
                  name: tenant.name,
                  slugInput: tenant.slug,
                  city: tenant.city,
                  phone: tenant.phone,
                  address: tenant.address ?? "",
                  email: tenant.email ?? "",
                  tagline: tenant.tagline ?? "",
                }}
              />
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="gap-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <Receipt aria-hidden className="size-4 text-muted-foreground" />
                Logo
              </CardTitle>
              <p className="text-sm text-muted-foreground">Logo kecil di header halaman publik.</p>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <LogoForm logoUrl={tenant.logoUrl} readOnly={readOnly} />
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="gap-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock aria-hidden className="size-4 text-muted-foreground" />
                Jam operasional
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Hanya informasi untuk pelanggan. Jam pengambilan pesanan tetap disepakati lewat WhatsApp.
              </p>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <OpeningHoursForm initial={hours} readOnly={readOnly} usingDefault={hoursAreDefault} />
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="gap-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <Receipt aria-hidden className="size-4 text-muted-foreground" />
                Syarat sewa
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Muncul di halaman detail kendaraan dan langkah konfirmasi pemesanan.
              </p>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <TermsForm initial={tenant.terms ?? ""} readOnly={readOnly} />
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="gap-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users aria-hidden className="size-4 text-muted-foreground" />
                Staf
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Staf masuk memakai email mereka sendiri lewat tautan di halaman login — tidak ada kata sandi yang harus
                dibagikan.
              </p>
            </CardHeader>
            <CardContent className="space-y-5 px-5 pb-5">
              <StaffInviteForm readOnly={readOnly} slotsLeft={slotsLeft} emailConfigured={isEmailConfigured()} />

              <ul className="divide-y rounded-xl border">
                {overview.staff.map((member) => (
                  <li key={member.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {member.name ?? member.invitedEmail ?? member.email}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {member.email}
                        {member.jobTitle ? ` · ${member.jobTitle}` : ""}
                      </p>
                    </div>
                    {member.pendingLogin ? (
                      <Badge variant="outline">Undangan belum diterima</Badge>
                    ) : null}
                    <Badge variant={member.role === "OWNER" ? "secondary" : "outline"}>
                      {ROLE_LABELS[member.role] ?? member.role}
                    </Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-5 xl:self-start">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Pratinjau halaman publik</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-5 pb-5 text-sm">
              <div className="flex items-center gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                  {tenant.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={tenant.logoUrl} alt="Logo rental" className="size-full object-contain" />
                  ) : null}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{tenant.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{tenant.tagline ?? tenant.city}</p>
                </div>
              </div>
              <p className="font-mono text-xs text-muted-foreground">/{tenant.slug}</p>

              <div className="space-y-1 border-t pt-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Jam operasional</p>
                {hoursAreDefault ? (
                  <p className="text-sm text-muted-foreground">
                    Belum tersimpan — pelanggan hanya melihat catatan bahwa jam pengambilan disepakati lewat WhatsApp.
                  </p>
                ) : (
                  <ul className="space-y-0.5 text-sm">
                    {overview.openingHours.map((row) => (
                      <li key={row.day} className="flex justify-between gap-3 tabular-nums">
                        <span>{dayLabel(row.day)}</span>
                        <span>{row.closed ? "Tutup" : `${row.open}–${row.close}`}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-1 border-t pt-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Syarat sewa</p>
                <p className="text-sm">
                  {tenant.terms ? `${terms.length} butir dari rental ini` : "Masih memakai syarat bawaan Flexrent"}
                </p>
              </div>

              <div className="space-y-1 border-t pt-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Akses tim</p>
                <p className="text-sm">
                  {overview.staff.length} anggota
                  {overview.staffLimit !== null ? ` dari ${overview.staffLimit} kursi paket` : ""}
                </p>
                {context.plan ? (
                  <p className="text-xs text-muted-foreground">
                    Paket {context.plan.name} · {formatRupiah(context.plan.priceMonthly)} per bulan
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Belum ada paket langganan aktif.</p>
                )}
                <Button asChild variant="link" size="sm" className="h-auto p-0">
                  <Link href="/dashboard/billing">Kelola langganan</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  )
}
