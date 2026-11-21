import NextAuth, { type NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"
import Nodemailer from "next-auth/providers/nodemailer"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/db"
import { emailFrom, getEmailTransporter, smtpServer } from "@/lib/email"

// Saat memproses tautan masuk, Auth.js menghapus sesi lama yang tertinggal di
// cookie. PrismaAdapter memakai session.delete() yang gagal kalau barisnya memang
// tidak ada (P2025). Error itu akan muncul sebagai "Configuration" di /login, jadi
// deleteSession dibuat idempoten di sini.
const adapter: NextAuthConfig["adapter"] = {
  ...PrismaAdapter(prisma),
  deleteSession: async (sessionToken: string) => {
    await prisma.session.deleteMany({ where: { sessionToken } })
  },
}

const providers: NextAuthConfig["providers"] = []

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  )
}

// Magic link. Tanpa SMTP_HOST tautan hanya dicetak ke terminal (mode dev),
// sehingga alur tetap bisa diuji tanpa akun email.
providers.push(
  Nodemailer({
    from: emailFrom,
    maxAge: 15 * 60,
    // Provider ini menolak dibuat tanpa `server`, padahal pengiriman di bawah
    // memakai transporter sendiri; jadi smtpServer hanya perlu ada.
    server: smtpServer,
    async sendVerificationRequest({ identifier, url, provider }) {
      const transport = getEmailTransporter()
      if (!transport) {
        console.log(`\n[magic link] ${identifier}\n${url}\n`)
        return
      }
      await transport.sendMail({
        to: identifier,
        from: provider.from as string,
        subject: "Masuk ke Flexrent",
        text: `Buka tautan ini untuk masuk (berlaku 15 menit):\n${url}\n\nKalau Anda tidak meminta, abaikan email ini.`,
        html: `<p>Buka tautan berikut untuk masuk ke Flexrent. Tautan berlaku 15 menit.</p><p><a href="${url}">Masuk sekarang</a></p><p style="color:#64748b;font-size:13px">Kalau Anda tidak meminta tautan ini, abaikan email tersebut.</p>`,
      })
    },
  })
)

export const authConfig: NextAuthConfig = {
  adapter,
  session: { strategy: "database" },
  providers,
  pages: {
    signIn: "/login",
    verifyRequest: "/login/verify",
    error: "/login",
  },
  trustHost: true,
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
