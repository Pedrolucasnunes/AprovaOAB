import { ImageResponse } from "next/og"

// Imagem de compartilhamento (WhatsApp, LinkedIn, X...) gerada dinamicamente.
// Aplica-se à home e a qualquer rota sem opengraph-image própria.
export const alt =
  "AprovaOAB — estude só o que você precisa pra passar na 1ª fase da OAB"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#0F172A",
          backgroundImage:
            "radial-gradient(ellipse 80% 80% at 20% 0%, rgba(16,185,129,0.18), transparent 60%), radial-gradient(ellipse 70% 70% at 100% 100%, rgba(59,130,246,0.14), transparent 55%)",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Wordmark */}
        <div style={{ display: "flex", alignItems: "center", fontSize: 34, fontWeight: 700 }}>
          <span style={{ color: "#E5E7EB" }}>Aprova</span>
          <span style={{ color: "#10B981" }}>OAB</span>
        </div>

        {/* Título */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              fontSize: 76,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              color: "#E5E7EB",
            }}
          >
            Estude&nbsp;<span style={{ color: "#10B981" }}>só o que você precisa</span>
            &nbsp;pra passar na OAB.
          </div>
          <div style={{ display: "flex", marginTop: 28, fontSize: 30, color: "#9CA3AF" }}>
            Diagnóstico por matéria · plano pelos seus erros · simulados no padrão FGV
          </div>
        </div>

        {/* Rodapé */}
        <div style={{ display: "flex", fontSize: 26, color: "#9CA3AF" }}>
          Comece grátis · sem cartão de crédito · aprovaoab.app.br
        </div>
      </div>
    ),
    { ...size }
  )
}
