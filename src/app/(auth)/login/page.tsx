import { redirect } from "next/navigation"
import { LoginForm } from "@/components/auth/login-form"
import { auth } from "@/lib/auth"

export const metadata = {
  title: "Masuk",
  description: "Masuk ke dashboard rental Anda dengan tautan rahasia yang dikirim ke email.",
}

const ERROR_TEXT: Record<string, string> = {
  Verification: "Tautan masuk tidak valid atau sudah kedaluwarsa. Kirim tautan baru.",
  google: "Masuk dengan Google belum selesai. Coba lagi atau gunakan tautan email.",
  Default: "Terjadi kesalahan saat masuk. Coba lagi sebentar.",
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; error?: string }>
}) {
  const params = await searchParams
  const session = await auth()
  if (session?.user) redirect("/dashboard")

  const mode = params.mode === "register" ? "register" : "login"
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)

  return (
    <LoginForm
      mode={mode}
      googleEnabled={googleEnabled}
      error={params.error ? (ERROR_TEXT[params.error] ?? ERROR_TEXT.Default) : undefined}
    />
  )
}
