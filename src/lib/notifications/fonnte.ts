import { stubNotifier, type WhatsAppMessage, type WhatsAppNotifier, type WhatsAppResult } from "./provider"

const FONTE_ENDPOINT = "https://api.fonnte.com/send"

type FonnteResponse = { status?: boolean; reason?: string; id?: unknown[] }

async function sendFonnte({ to, message }: WhatsAppMessage): Promise<WhatsAppResult> {
  const apiKey = process.env.FONNTE_API_KEY
  if (!apiKey) return stubNotifier.send({ to, message })

  const body = new URLSearchParams({ target: to.replace(/^\+/, ""), message })
  if (process.env.WHATSAPP_SENDER_ID) body.set("sender", process.env.WHATSAPP_SENDER_ID)

  const response = await fetch(FONTE_ENDPOINT, {
    method: "POST",
    headers: { authorization: apiKey, "content-type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(15_000),
  })

  const text = await response.text()
  let payload: FonnteResponse = {}
  try {
    payload = JSON.parse(text) as FonnteResponse
  } catch {
    // Balasan bukan JSON: anggap gagal, isi text masuk ke detail.
  }
  if (!response.ok || payload.status !== true) {
    return { ok: false, detail: `${response.status} ${payload.reason ?? text.slice(0, 120)}`.trim() }
  }
  return { ok: true, detail: payload.id?.length ? `id=${String(payload.id[0])}` : undefined }
}

export const fonnteNotifier: WhatsAppNotifier = { id: "fonnte", send: sendFonnte }
