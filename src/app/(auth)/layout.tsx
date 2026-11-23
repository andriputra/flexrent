import Link from "next/link"
import { Bike } from "lucide-react"
import { Providers } from "@/components/shared/providers"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-10">
        {/*
          Latar bergerak: dua sorot warna merek melayang pelan di atas kisi garis.
          Kisi dibuat memudar ke tepi supaya kartu tetap terasa sebagai fokus.
        */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-muted/40">
          <div className="anim-drift absolute -top-44 left-[-12%] size-[34rem] rounded-full bg-[radial-gradient(circle,rgb(245_158_11/0.22),transparent_62%)] blur-[70px] dark:bg-[radial-gradient(circle,rgb(245_158_11/0.26),transparent_62%)]" />
          <div className="anim-drift absolute bottom-[-26%] right-[-14%] size-[38rem] rounded-full bg-[radial-gradient(circle,rgb(37_99_235/0.20),transparent_62%)] blur-[80px] [--d:-9s] dark:bg-[radial-gradient(circle,rgb(37_99_235/0.26),transparent_62%)]" />
          <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(72%_62%_at_50%_42%,black,transparent_78%)]" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
        </div>

        <Link href="/" className="anim-rise mb-8 flex items-center gap-2 text-lg font-semibold">
          <span className="anim-float flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[0_12px_30px_-14px_var(--primary)]">
            <Bike aria-hidden className="size-5" />
          </span>
          Flexrent
        </Link>

        <div className="anim-rise w-full max-w-md space-y-6 [--d:90ms]">{children}</div>

        <p className="anim-fade mt-8 text-xs text-muted-foreground [--d:240ms]">
          Dengan masuk, Anda menyetujui{" "}
          <Link href="/" className="underline-offset-2 hover:underline">
            ketentuan layanan
          </Link>{" "}
          Flexrent.
        </p>

        <p className="anim-fade mt-3 text-center text-xs text-muted-foreground [--d:300ms]">
          © {new Date().getFullYear()}{" "}
          <a
            href="https://flexbox.co.id"
            target="_blank"
            rel="noreferrer"
            className="link-underline font-medium"
          >
            Flexbox Indonesia
          </a>
          . Seluruh hak cipta dilindungi.
        </p>
      </div>
    </Providers>
  )
}
