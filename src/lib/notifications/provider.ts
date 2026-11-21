export type WhatsAppMessage = {
  /** Nomor tujuan sudah dinormalkan (628…). */
  to: string
  message: string
}

export type WhatsAppResult = {
  ok: boolean
  /** Diarsipkan ke NotificationLog.detail supaya bisa diaudit tanpa log server. */
  detail?: string
}

/** Abstraksi pengirim WhatsApp. Fonnte implementasi awal; ganti tanpa menyentuh pemanggil. */
export interface WhatsAppNotifier {
  readonly id: string
  send(message: WhatsAppMessage): Promise<WhatsAppResult>
}

/** Penanda provider belum dikonfigurasi: pesan hanya dicatat, tidak dikirim. */
export const stubNotifier: WhatsAppNotifier = {
  id: "stub",
  async send(message) {
    console.info("[whatsapp:stub] →", message.to, message.message.slice(0, 60))
    return { ok: true, detail: "stub: tidak dikirim" }
  },
}

export function isWhatsAppConfigured(): boolean {
  return process.env.WHATSAPP_PROVIDER === "fonnte" && Boolean(process.env.FONNTE_API_KEY)
}

/** Penyedia WhatsApp mengharapkan 62…; data internal disimpan dalam bentuk 08…. */
export function toInternationalPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (digits.startsWith("62")) return digits
  return `62${digits.replace(/^0/, "")}`
}
