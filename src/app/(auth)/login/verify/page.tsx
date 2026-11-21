import Link from "next/link"
import { ArrowLeft, MailCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ResendLinkButton } from "@/components/auth/resend-link-button"

export const metadata = { title: "Cek email Anda" }

export default async function VerifyRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; mode?: string }>
}) {
  const params = await searchParams
  const email = params.email?.trim() ?? ""
  const isRegister = params.mode === "register"
  const smtpConfigured = Boolean(process.env.SMTP_HOST)

  return (
    <Card className="shadow-pop">
      <CardHeader className="space-y-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-accent/15 text-accent">
          <MailCheck aria-hidden className="size-5" />
        </span>
        <CardTitle className="text-xl">Cek email Anda</CardTitle>
        <CardDescription>
          {email ? (
            <>
              Tautan masuk kami kirim ke <span className="font-medium text-foreground">{email}</span>. Buka
              tautan itu dari perangkat yang sama — tautan berlaku 15 menit.
            </>
          ) : (
            "Tautan masuk sudah dikirim. Buka tautan dari perangkat yang sama; masa berlaku 15 menit."
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!smtpConfigured ? (
          <p className="rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Mode pengembangan.</span> Karena{" "}
            <code>SMTP_HOST</code> belum diisi, tautan masuk tidak dikirim lewat email — muncul di terminal
            tempat <code>npm run dev</code> berjalan, diawali <code>[magic link]</code>. Salin dan buka di
            peramban ini.
          </p>
        ) : null}

        <p className="text-sm text-muted-foreground">
          Tidak menerima apa pun? Cek folder spam, atau kirim ulang tautannya.
        </p>

        <ResendLinkButton email={email} isRegister={isRegister} />

        <Button asChild variant="ghost" size="sm" className="w-full">
          <Link href={isRegister ? "/login?mode=register" : "/login"}>
            <ArrowLeft aria-hidden />
            Ganti email
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
