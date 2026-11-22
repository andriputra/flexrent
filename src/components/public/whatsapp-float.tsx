import { WhatsAppIcon } from "@/components/public/whatsapp-icon"
import { whatsappLink } from "@/lib/tenant-public"

/** Tombol WhatsApp mengambang di halaman publik (menurut panduan desain). */
export function WhatsAppFloat({ phone, name }: { phone: string; name: string }) {
  return (
    <a
      href={whatsappLink(phone, `Halo ${name}, saya mau tanya ketersediaan kendaraan.`)}
      target="_blank"
      rel="noreferrer"
      aria-label={`Chat WhatsApp ${name}`}
      className="fixed right-5 bottom-5 z-40 isolate flex size-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_18px_36px_-16px_rgb(37_211_102/0.9)] transition-transform duration-300 hover:-translate-y-0.5 hover:scale-105 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:scale-100"
    >
      <span aria-hidden className="anim-ping absolute inset-0 -z-10 rounded-full bg-[#25D366]/45" />
      <WhatsAppIcon className="size-6" />
    </a>
  )
}
