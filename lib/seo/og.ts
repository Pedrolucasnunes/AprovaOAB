// Base de Open Graph compartilhada. O Next faz merge RASO de `openGraph`: quando
// uma página define o próprio objeto, ele substitui inteiro o do root layout —
// então siteName/locale do root se perdem. Espalhar `OG_BASE` em cada página que
// sobrescreve `openGraph` garante og:site_name e og:locale sitewide.
export const OG_BASE = {
  type: "website",
  siteName: "AprovaOAB",
  locale: "pt_BR",
} as const
