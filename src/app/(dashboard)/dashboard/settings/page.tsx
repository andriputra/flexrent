import Link from "next/link"
import { Building2, Clock, Eye, ImageIcon, Lock, ScrollText, Users } from "lucide-react"
import type { ReactNode } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Notice, PageHeader } from "@/components/shared/layout-parts"
import { LogoForm } from "@/components/settings/logo-form"
import { OpeningHoursForm } from "@/components/settings/opening-hours-form"
import { ProfileForm } from "@/components/settings/profile-form"
import { StaffInviteForm } from "@/components/settings/staff-invite-form"
import { TermsForm } from "@/components/settings/terms-form"
import { defaultOpeningHours, dayLabel } from "@/lib/opening-hours"
import { isEmailConfigured } from "@/lib/email"
import { formatRupiah, initials } from "@/lib/format"
import { termsList } from "@/lib/terms"
import { requireTenant } from "@/lib/tenant"
import { getSettingsOverview } from "@/server/queries/settings"

export const metadata = { title: "Pengaturan" }

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Pemilik",
  ADMIN: "Admin",
  STAFF: "Staf",
}

function SectionTitle({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <CardTitle className="flex items-center gap-2.5 text-base">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary [&_svg]:size-4">
        {icon}
      </span>
      {children}
    </CardTitle>
  )
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
        description="Identitas halaman publik, jam operasional, syarat sewa, dan akses tim."
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
        <Notice tone="warning" icon={<Lock aria-hidden />}>{blockedReason}</Notice>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <Card className="shadow-card">
            <CardHeader className="gap-1">
              <SectionTitle icon={<Building2 aria-hidden />}>Profil rental</SectionTitle>
              <p className="text-sm text-muted-foreground">Dipakai di halaman publik dan tagihan langganan.</p>
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
              <SectionTitle icon={<ImageIcon aria-hidden />}>Logo</SectionTitle>
              <p className="text-sm text-muted-foreground">Tampil di header halaman publik.</p>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <LogoForm logoUrl={tenant.logoUrl} readOnly={readOnly} />
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="gap-1">
              <SectionTitle icon={<Clock aria-hidden />}>Jam operasional</SectionTitle>
              <p className="text-sm text-muted-foreground">
                Tampil di footer halaman publik; jam pengambilan tetap disepakati lewat WhatsApp.
              </p>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <OpeningHoursForm initial={hours} readOnly={readOnly} usingDefault={hoursAreDefault} />
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="gap-1">
              <SectionTitle icon={<ScrollText aria-hidden />}>Syarat sewa</SectionTitle>
              <p className="text-sm text-muted-foreground">
                Tampil di detail kendaraan dan langkah konfirmasi pesanan.
              </p>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <TermsForm initial={tenant.terms ?? ""} readOnly={readOnly} />
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="gap-1">
              <SectionTitle icon={<Users aria-hidden />}>Staf</SectionTitle>
              <p className="text-sm text-muted-foreground">
                Staf masuk lewat tautan di halaman login memakai email masing-masing.
              </p>
            </CardHeader>
            <CardContent className="space-y-5 px-5 pb-5">
              <StaffInviteForm readOnly={readOnly} slotsLeft={slotsLeft} emailConfigured={isEmailConfigured()} />

              <ul className="divide-y rounded-xl border">
                {overview.staff.map((member) => (
                  <li key={member.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <Avatar size="sm">
                      <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                        {initials(member.name || member.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {member.name ?? member.invitedEmail ?? member.email}
                      </p>
                      <p className="truncate text-xs tabular-nums text-muted-foreground">
                        {member.email}
                        {member.jobTitle ? ` · ${member.jobTitle}` : ""}
                      </p>
                    </div>
                    {member.pendingLogin ? (
                      <Badge variant="outline" className="shrink-0 border-transparent bg-warning/12 text-warning">
                        Undangan tertunda
                      </Badge>
                    ) : null}
                    <Badge
                      variant={member.role === "OWNER" ? "secondary" : "outline"}
                      className={member.role === "ADMIN" ? "border-transparent bg-info/12 text-info" : undefined}
                    >
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
              <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/40 px-3 py-2.5">
                <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-card">
                  {tenant.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={tenant.logoUrl} alt="Logo rental" className="size-full object-contain" />
                  ) : (
                    <span className="text-xs font-semibold text-primary">{initials(tenant.name)}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{tenant.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{tenant.tagline ?? tenant.city}</p>
                </div>
              </div>
              <p className="font-mono text-xs text-muted-foreground">/{tenant.slug}</p>

              <div className="space-y-1.5 border-t pt-3">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Jam operasional
                </p>
                {hoursAreDefault ? (
                  <p className="text-xs text-muted-foreground">Belum disimpan — tidak tampil di halaman publik.</p>
                ) : (
                  <ul className="space-y-0.5 text-sm">
                    {overview.openingHours.map((row) => (
                      <li key={row.day} className="flex justify-between gap-3 tabular-nums">
                        <span>{dayLabel(row.day)}</span>
                        <span className={row.closed ? "text-muted-foreground" : undefined}>
                          {row.closed ? "Tutup" : `${row.open}–${row.close}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-1.5 border-t pt-3">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Syarat sewa
                </p>
                <p className="text-sm">
                  {tenant.terms ? `${terms.length} butir` : <span className="text-muted-foreground">Bawaan Flexrent</span>}
                </p>
              </div>

              <div className="space-y-1.5 border-t pt-3">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Akses tim
                </p>
                <p className="text-sm tabular-nums">
                  {overview.staff.length} anggota
                  {overview.staffLimit !== null ? ` dari ${overview.staffLimit} kursi paket` : ""}
                </p>
                {context.plan ? (
                  <p className="text-xs text-muted-foreground">
                    Paket {context.plan.name} · {formatRupiah(context.plan.priceMonthly)} per bulan
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Belum ada paket aktif.</p>
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
