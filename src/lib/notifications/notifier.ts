import { fonnteNotifier } from "./fonnte"
import { isWhatsAppConfigured, stubNotifier, type WhatsAppNotifier } from "./provider"

/** Tanpa FONNTE_API_KEY sistem tetap jalan: pesan hanya dicatat, tidak dikirim. */
export function getWhatsAppNotifier(): WhatsAppNotifier {
  return isWhatsAppConfigured() ? fonnteNotifier : stubNotifier
}
