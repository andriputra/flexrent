import {
  Bike,
  CalendarCheck,
  LayoutDashboard,
  LineChart,
  Receipt,
  Settings,
  Star,
  Users,
  Wallet,
  Wrench,
} from "lucide-react"

export type NavItem = {
  href: string
  label: string
  icon: typeof Bike
  exact?: boolean
}

export type NavGroup = {
  label: string
  items: NavItem[]
}

/** Grup dipakai sidebar & dropdown mobile supaya pengelompokan menu identik. */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Utama",
    items: [{ href: "/dashboard", label: "Ringkasan", icon: LayoutDashboard, exact: true }],
  },
  {
    label: "Operasional",
    items: [
      { href: "/dashboard/vehicles", label: "Kendaraan", icon: Bike },
      { href: "/dashboard/bookings", label: "Booking", icon: CalendarCheck },
      { href: "/dashboard/customers", label: "Pelanggan", icon: Users },
      { href: "/dashboard/maintenance", label: "Perawatan", icon: Wrench },
      { href: "/dashboard/testimonials", label: "Testimoni", icon: Star },
    ],
  },
  {
    label: "Keuangan",
    items: [
      { href: "/dashboard/payments", label: "Pembayaran", icon: Wallet },
      { href: "/dashboard/reports", label: "Laporan", icon: LineChart },
    ],
  },
  {
    label: "Pengelolaan",
    items: [
      { href: "/dashboard/billing", label: "Langganan", icon: Receipt },
      { href: "/dashboard/settings", label: "Pengaturan", icon: Settings },
    ],
  },
]

/** Urutan datar, dipakai top bar & navigasi bawah yang tidak butuh judul grup. */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items)

/** Item aktif dicocokkan dengan awalan path agar sub-halaman ikut menyalakan menu. */
export function isActiveItem(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}
