"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { LogIn, Mail, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  registerWithPasswordAction,
  signInWithEmailAction,
  signInWithGoogleAction,
  signInWithPasswordAction,
} from "@/server/actions/auth"

const GOOGLE_LOGO = (
  <svg aria-hidden viewBox="0 0 24 24" className="size-4">
    <path
      fill="#4285F4"
      d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.8z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1 .7-2.4 1.1-4 1.1-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24z"
    />
    <path fill="#FBBC05" d="M5.4 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.4a12 12 0 0 0 0 10.8l4-3.1z" />
    <path
      fill="#EA4335"
      d="M12 4.7c1.8 0 3.4.6 4.6 1.8l3.4-3.4A11.6 11.6 0 0 0 12 0 12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.8 8.9 4.7 12 4.7z"
    />
  </svg>
)

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/

export function LoginForm({
  mode,
  googleEnabled,
  emailConfigured,
  error,
}: {
  mode: "login" | "register"
  googleEnabled: boolean
  emailConfigured: boolean
  error?: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [formError, setFormError] = useState<string | null>(error ?? null)

  const isRegister = mode === "register"

  function submitPassword(event: React.FormEvent) {
    event.preventDefault()
    setFormError(null)
    const value = email.trim()
    if (!EMAIL_PATTERN.test(value)) {
      setFormError("Masukkan email yang valid, contoh rental@kita.id")
      return
    }
    if (isRegister) {
      if (name.trim().length < 2) {
        setFormError("Nama minimal 2 karakter.")
        return
      }
      if (password.length < 8) {
        setFormError("Sandi minimal 8 karakter.")
        return
      }
    } else if (!password) {
      setFormError("Isi sandi Anda.")
      return
    }

    startTransition(async () => {
      const result = isRegister
        ? await registerWithPasswordAction(name, value, password)
        : await signInWithPasswordAction(value, password)
      if (!result.ok) {
        setFormError(result.error)
        toast.error(result.error)
        return
      }
      toast.success(isRegister ? "Akun berhasil dibuat." : "Anda masuk.")
      router.push(result.data)
    })
  }

  function submitEmailLink(event: React.FormEvent) {
    event.preventDefault()
    setFormError(null)
    const value = email.trim()
    if (!EMAIL_PATTERN.test(value)) {
      setFormError("Masukkan email yang valid, contoh rental@kita.id")
      return
    }
    startTransition(async () => {
      const result = await signInWithEmailAction(value, isRegister ? "/onboarding" : "/dashboard")
      if (!result.ok) {
        setFormError(result.error)
        toast.error(result.error)
        return
      }
      router.push(`/login/verify?email=${encodeURIComponent(value)}`)
    })
  }

  return (
    <Card className="shadow-pop">
      <CardHeader className="space-y-2">
        <CardTitle className="text-xl">{isRegister ? "Buat akun rental Anda" : "Masuk ke Flexrent"}</CardTitle>
        <CardDescription>
          {isRegister
            ? "Pakai email dan sandi Anda sendiri. Tanpa kartu kredit, masa uji 14 hari berjalan otomatis."
            : "Masuk dengan email dan sandi yang Anda buat saat mendaftar."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {formError ? (
          <p
            role="alert"
            className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
          >
            {formError}
          </p>
        ) : null}

        {googleEnabled ? (
          <>
            <form action={signInWithGoogleAction.bind(null, isRegister ? "/onboarding" : "/dashboard")}>
              <Button type="submit" variant="outline" className="w-full" disabled={pending}>
                {GOOGLE_LOGO}
                Lanjut dengan Google
              </Button>
            </form>
            <div className="relative">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                atau
              </span>
            </div>
          </>
        ) : null}

        <form onSubmit={submitPassword} className="space-y-3">
          {isRegister ? (
            <div className="space-y-1.5">
              <Label htmlFor="name">Nama Anda</Label>
              <Input
                id="name"
                name="name"
                autoComplete="name"
                placeholder="Andi"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={pending}
                required
              />
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="rental@kita.id"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={pending}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Sandi</Label>
            <Input
              id="password"
              type="password"
              name="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              placeholder={isRegister ? "Minimal 8 karakter" : "Sandi akun Anda"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={pending}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-accent text-accent-foreground hover:bg-accent-hover"
            disabled={pending}
          >
            {isRegister ? <User aria-hidden /> : <LogIn aria-hidden />}
            {pending ? "Memproses…" : isRegister ? "Buat akun" : "Masuk"}
          </Button>
        </form>

        {emailConfigured ? (
          <form onSubmit={submitEmailLink} className="space-y-2">
            <Separator />
            <p className="text-xs text-muted-foreground">
              Lupa sandi atau belum membuatnya? Kami kirim tautan masuk sekali pakai ke email ini.
            </p>
            <Button type="submit" variant="outline" className="w-full" disabled={pending}>
              <Mail aria-hidden />
              {pending ? "Mengirim…" : "Kirim tautan masuk"}
            </Button>
          </form>
        ) : null}

        <p className="text-center text-sm text-muted-foreground">
          {isRegister ? "Sudah punya akun rental?" : "Belum punya rental?"}{" "}
          <Link
            href={isRegister ? "/login" : "/login?mode=register"}
            className="font-medium text-foreground underline underline-offset-2 hover:text-accent"
          >
            {isRegister ? "Masuk saja" : "Buat akun baru"}
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
