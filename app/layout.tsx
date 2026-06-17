import type { Metadata } from 'next'
import Script from 'next/script'
import { Geist, Geist_Mono, Fraunces, DM_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from "sonner"
import { CookieBanner } from '@/components/cookie-banner'
import { ClarityAnalytics } from '@/components/clarity-analytics'
import { APP_URL } from '@/lib/app-url'
import './globals.css'

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID

// ── Fontes originais do projeto ──────────────────────────────
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
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

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: 'AprovaOAB - Preparação Inteligente para OAB',
  description: 'Plataforma de diagnóstico e gestão de desempenho para aprovação na OAB através da resolução inteligente de questões.',
  generator: 'v0.app',
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
          <Script id="consent-default" strategy="beforeInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'granted',functionality_storage:'granted',security_storage:'granted'});`}
          </Script>
          <Script id="gtm-init" strategy="afterInteractive">
            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`}
          </Script>
        </head>
      )}
      <body className="font-sans antialiased" suppressHydrationWarning>
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
