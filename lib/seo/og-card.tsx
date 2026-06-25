import { ImageResponse } from "next/og"

// Card de Open Graph reutilizável (1200×630), no mesmo visual do card da home
// (app/opengraph-image.tsx): fundo azul-marinho com degradê verde/azul, wordmark
// AprovaOAB, eyebrow em verde, título grande e rodapé. Usado pelas páginas de SEO
// (/questoes, matéria e questão), que definem openGraph próprio e por isso não
// herdavam a imagem do root.
export const OG_SIZE = { width: 1200, height: 630 }
export const OG_CONTENT_TYPE = "image/png"

export function ogImage({
  eyebrow,
  title,
  footer,
}: {
  eyebrow: string
  title: string
  footer: string
}) {
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

        {/* Eyebrow + título */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 30,
              fontWeight: 600,
              color: "#10B981",
              letterSpacing: "0.02em",
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              marginTop: 18,
              fontSize: 72,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              color: "#E5E7EB",
            }}
          >
            {title}
          </div>
        </div>

        {/* Rodapé */}
        <div style={{ display: "flex", fontSize: 26, color: "#9CA3AF" }}>{footer}</div>
      </div>
    ),
    { ...OG_SIZE }
  )
}
