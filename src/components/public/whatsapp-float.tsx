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
      className="fixed bottom-5 right-5 z-40 flex size-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-pop transition-transform duration-150 hover:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100"
    >
      <WhatsAppIcon className="size-6" />
    </a>
  )
}
