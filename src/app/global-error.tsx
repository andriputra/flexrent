"use client"

/**
 * Penjaga terakhir: dipakai kalau root layout ikut gagal, jadi tidak boleh
 * mengandalkan komponen, CSS, atau router dari layout itu.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="id">
      <body style={{ margin: 0, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b1220", color: "#e2e8f0", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>Aplikasi bermasalah</h1>
          <p style={{ fontSize: 14, lineHeight: 1.6, margin: "0 0 20px", color: "#94a3b8" }}>
            Flexrent gagal menampilkan halaman ini. Muat ulang aplikasi, atau kembali ke halaman utama.
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button
              type="button"
              onClick={reset}
              style={{ fontSize: 14, padding: "10px 16px", borderRadius: 10, border: "none", background: "#22c55e", color: "#04110a", cursor: "pointer" }}
            >
              Muat ulang
            </button>
            <button
              type="button"
              onClick={() => window.location.assign("/")}
              style={{ fontSize: 14, padding: "10px 16px", borderRadius: 10, border: "1px solid #334155", color: "#e2e8f0", background: "transparent", cursor: "pointer" }}
            >
              Halaman utama
            </button>
          </div>
        </main>
      </body>
    </html>
  )
}
