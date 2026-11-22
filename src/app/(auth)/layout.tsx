import Link from "next/link"
import { Bike } from "lucide-react"
import { Providers } from "@/components/shared/providers"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className="flex min-h-dvh flex-col items-center justify-center bg-muted/40 px-4 py-10">
        <Link href="/" className="mb-8 flex items-center gap-2 text-lg font-semibold">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Bike aria-hidden className="size-5" />
          </span>
          Flexrent
        </Link>

        <div className="w-full max-w-md space-y-6">{children}</div>

        <p className="mt-8 text-xs text-muted-foreground">
          Dengan masuk, Anda menyetujui{" "}
          <Link href="/" className="underline-offset-2 hover:underline">
            ketentuan layanan
          </Link>{" "}
          Flexrent.
        </p>

        <p className="mt-3 text-center text-xs text-muted-foreground">
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
