"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body>
        <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", padding: 24, background: "#f4f1ea" }}>
          <div style={{ width: "100%", maxWidth: 360, borderRadius: 16, background: "#fff", padding: 24, textAlign: "center", boxShadow: "0 10px 30px rgba(0,0,0,.08)" }}>
            <p style={{ fontSize: 18, fontWeight: 700, color: "#16241b" }}>Algo deu errado</p>
            <p style={{ marginTop: 8, fontSize: 14, color: "#5b6b5e" }}>
              Nao foi possivel carregar o aplicativo agora. Verifique sua conexao e tente novamente em alguns instantes.
            </p>
            <button
              type="button"
              onClick={reset}
              style={{ marginTop: 16, width: "100%", borderRadius: 13, background: "#16a34a", color: "#fff", padding: "10px 20px", fontWeight: 600, border: "none" }}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
