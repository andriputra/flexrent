import nodemailer from "nodemailer"

/**
 * SMTP dipakai dua pihak: tautan masuk Auth.js dan email undangan staf. Konfigurasinya
 * sengaja di sini supaya keduanya membaca environment yang sama.
 */

const smtpHost = process.env.SMTP_HOST
const smtpPort = Number(process.env.SMTP_PORT ?? 587)
export const emailFrom = process.env.EMAIL_FROM ?? "Flexrent <noreply@localhost>"

export const smtpServer = {
  host: smtpHost ?? "localhost",
  port: smtpPort,
  secure: smtpPort === 465,
  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
}

let transporter: nodemailer.Transporter | null = null

/** `null` bila SMTP_HOST kosong — mode dev, isi email dicetak ke terminal. */
export function getEmailTransporter(): nodemailer.Transporter | null {
  if (!smtpHost) return null
  transporter ??= nodemailer.createTransport(smtpServer)
  return transporter
}

export function isEmailConfigured(): boolean {
  return Boolean(smtpHost)
}

export type EmailMessage = { to: string; subject: string; text: string; html: string }

/** Kirim email. Tanpa SMTP, pesan hanya dicatat supaya alur tetap bisa diuji lokal. */
export async function sendEmail(message: EmailMessage): Promise<boolean> {
  const transport = getEmailTransporter()
  if (!transport) {
    console.log(`[email] (SMTP_HOST kosong) ke ${message.to}: ${message.subject}\n${message.text}\n`)
    return false
  }
  await transport.sendMail({ ...message, from: emailFrom })
  return true
}
