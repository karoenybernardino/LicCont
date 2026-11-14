"use client";

// Último recurso: substitui o layout inteiro, então leva o próprio estilo.
export default function ErroGlobal({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: "#05090b",
          color: "#eef5f6",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <main
          style={{
            maxWidth: 560,
            width: "100%",
            textAlign: "center",
            background: "#0b1418",
            border: "1px solid #1f3239",
            borderRadius: 18,
            padding: "36px 36px 30px",
          }}
        >
          <p style={{ fontFamily: "monospace", fontSize: 12, letterSpacing: "0.1em", color: "#9bb8bf" }}>ERRO DO SISTEMA</p>
          <h1 style={{ fontSize: 24, margin: "8px 0" }}>Algo deu errado do nosso lado</h1>
          <p style={{ fontSize: 14.5, lineHeight: "22px", color: "#9bb8bf" }}>
            Nada do que você salvou foi perdido. Tente de novo em alguns instantes. Se continuar, avise o suporte.
          </p>
          {error.digest && <p style={{ fontSize: 13, color: "#9bb8bf" }}>Código {error.digest}</p>}
          <button
            type="button"
            onClick={reset}
            style={{ marginTop: 8, minHeight: 40, padding: "0 20px", border: 0, borderRadius: 8, background: "#2dd4bf", color: "#0b2e3a", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
          >
            Tentar de novo
          </button>
        </main>
      </body>
    </html>
  );
}
