import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "Flexrent — aplikasi manajemen rental motor & mobil"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

/** Kartu share bawaan untuk halaman yang belum punya logo sendiri. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: "linear-gradient(135deg, #0b1220 0%, #16233c 60%, #1f3350 100%)",
          color: "#f8fafc",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "#22c55e",
              display: "flex",
            }}
          />
          <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -0.5 }}>Flexrent</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 76,
              fontWeight: 700,
              letterSpacing: -2,
              lineHeight: 1.05,
            }}
          >
            <div>Kelola rental motor &amp; mobil</div>
            <div>dalam satu tempat</div>
          </div>
          <div style={{ fontSize: 32, color: "#94a3b8" }}>
            Armada, pemesanan online, pembayaran, dan laporan — tanpa spreadsheet
          </div>
        </div>
      </div>
    ),
    size
  )
}
