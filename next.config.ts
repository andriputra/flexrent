import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // KTP/SIM pesanan dan foto admin ikut di dalam body request Server Action.
      // Plafon default 1 MB membuat upload gagal sebelum validasi kita jalan
      // (halaman hanya menampilkan error boundary). Jaga selaras dengan
      // ACTION_BODY_LIMIT_BYTES di src/lib/upload-limits.ts; Vercel menolak body > 4,5 MB.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
