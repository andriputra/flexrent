import { Bike, CalendarCheck, LayoutDashboard, Users, Wallet, Wrench } from "lucide-react"

export type NavItem = {
  href: string
  label: string
  icon: typeof Bike
  exact?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Ringkasan", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/vehicles", label: "Kendaraan", icon: Bike },
  { href: "/dashboard/bookings", label: "Booking", icon: CalendarCheck },
  { href: "/dashboard/customers", label: "Pelanggan", icon: Users },
  { href: "/dashboard/maintenance", label: "Perawatan", icon: Wrench },
  { href: "/dashboard/payments", label: "Pembayaran", icon: Wallet },
]

/** Item aktif dicocokkan dengan awalan path agar sub-halaman ikut menyalakan menu. */
export function isActiveItem(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}
