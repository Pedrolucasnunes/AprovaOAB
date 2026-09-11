import type { Metadata } from 'next'
import Script from 'next/script'
import { Geist, Geist_Mono, Fraunces, DM_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from "sonner"
import { CookieBanner } from '@/components/cookie-banner'
import { ClarityAnalytics } from '@/components/clarity-analytics'
import { JsonLd } from '@/components/seo/json-ld'
import { APP_URL } from '@/lib/app-url'
import './globals.css'

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID

// JSON-LD sitewide (Organization, WebSite, SoftwareApplication). Renderizado uma
// vez no body do root layout, em todas as páginas.
const SITE_JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "AprovaOAB",
    url: APP_URL,
    logo: `${APP_URL}/aprovaoab-logo-primary.png`,
    description:
      "Plataforma de preparação para a OAB com diagnóstico por matéria, questões no padrão FGV, simulados completos e plano de estudos personalizado.",
    areaServed: "BR",
    // Mesmos perfis do SOCIAL_LINKS de components/site/footer.tsx — os dois
    // andam juntos: é o par (link no site + sameAs) que o Google usa pra casar
    // o domínio com as contas.
    sameAs: [
      "https://x.com/AprovaOAB_app",
      "https://www.instagram.com/aprovaoab.app/",
      "https://www.linkedin.com/company/aprovaoab/",
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "AprovaOAB",
    url: APP_URL,
    inLanguage: "pt-BR",
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "AprovaOAB",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    url: APP_URL,
    offers: [
      { "@type": "Offer", name: "Grátis", price: "0", priceCurrency: "BRL" },
      { "@type": "Offer", name: "Pro", price: "19", priceCurrency: "BRL" },
    ],
  },
]

// ── Fontes originais do projeto ──────────────────────────────
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
})

// `preload: false` porque esta família NÃO RENDERIZA EM LUGAR NENHUM. O
// `.font-mono` do globals.css põe `--font-dm-mono` na frente dela, e o DM Mono
// sempre carrega — medido em set/2026 nas seis rotas públicas: zero elementos
// com Geist Mono computado. Ela seguia preloadada, 23 KB disputando a janela
// entre a primeira pintura e o LCP, pra nunca desenhar um caractere.
//
// Fica declarada, e não removida, porque continua sendo o fallback do
// `--font-mono` e das regras de `globals.css`. Sem preload ela só baixa se
// alguma superfície passar a usá-la de fato.
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  preload: false,
})

// ── Fontes da landing page ───────────────────────────────────
// Carregada como fonte variável (sem `weight` fixo) — mantém o eixo de optical
// sizing, que dá o peso dramático/alto contraste dos títulos no tamanho display
// (igual ao preview). Fixar weights estáticos achata esse contraste.
const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
})

// Sem preload: as duas faces (17,4 KB) são usadas acima da dobra, mas só em
// rótulo pequeno — o eyebrow do herói e a meta sob o CTA. Com `display: swap`
// esse texto aparece na fonte de sistema e troca depois, o que ninguém nota num
// rótulo de 12 px, e os 17,4 KB saem da disputa com o que o LCP precisa.
//
// O elemento do LCP é o parágrafo do herói, que usa Geist — essa é a única
// família cujo preload serve ao LCP.
const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
  preload: false,
})

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  // `template` monta o sufixo da marca uma vez só. Ele estava escrito à mão no fim
  // de cada `generateMetadata` das páginas públicas, comendo ~13 dos ~60 caracteres
  // que o Google exibe no resultado. As páginas agora declaram só o próprio título.
  title: {
    default: 'AprovaOAB - Preparação Inteligente para OAB',
    template: '%s | AprovaOAB',
  },
  description: 'Plataforma de diagnóstico e gestão de desempenho para aprovação na OAB através da resolução inteligente de questões.',
  // Sem isto o Google usa os padrões conservadores: miniatura pequena e trecho
  // curto. As páginas de conteúdo (/questoes, /provas, /editais) vivem justamente
  // de trecho longo. /dashboard e /admin seguem barrados pelo robots.txt.
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  twitter: {
    card: 'summary_large_image',
    site: '@AprovaOAB_app',
  },
  openGraph: {
    type: 'website',
    siteName: 'AprovaOAB',
    locale: 'pt_BR',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${geist.variable} ${geistMono.variable} ${fraunces.variable} ${dmMono.variable}`}
    >
      {GTM_ID && (
        <head>
          {/*
            Preconnect só pro googletagmanager, e a lista curta é deliberada.

            É a única origem de terceiro no caminho crítico: o `gtm.js` sai daqui
            logo depois da hidratação e o `gtag/js` do GA4 vem da MESMA origem,
            injetado pelo próprio GTM — então uma conexão cobre os dois. (Medido
            em set/2026 abortando o gtm.js: sem ele o gtag/js não carrega. O GA4
            já vive dentro do GTM; não há tag paralela pra consolidar.)

            As origens do Clarity ficam de fora de propósito. Preconnect abre
            socket durante o carregamento, que é a banda que o LCP está
            disputando — e o Clarity não precisa dela: medido, ele só começa a
            rodar ~5 s depois do LCP. Fica só o dns-prefetch, que resolve o nome
            sem ocupar conexão.
          */}
          <link rel="preconnect" href="https://www.googletagmanager.com" />
          <link rel="dns-prefetch" href="https://scripts.clarity.ms" />
          <Script id="consent-default" strategy="beforeInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'granted',functionality_storage:'granted',security_storage:'granted'});`}
          </Script>
          <Script id="gtm-init" strategy="afterInteractive">
            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`}
          </Script>
        </head>
      )}
      <body className="font-sans antialiased" suppressHydrationWarning>
        <JsonLd data={SITE_JSON_LD} />
        {GTM_ID && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
        )}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          {children}
        </ThemeProvider>
        <Analytics />
        <ClarityAnalytics />
        <Toaster richColors position="top-right" />
        {GTM_ID && <CookieBanner />}
      </body>
    </html>
  )
}
