import { withSentryConfig } from "@sentry/nextjs"

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  experimental: {
    // Melhora o tree-shaking destes pacotes (barrel imports). `motion` v12 não
    // está na lista default do Next; lucide-react reforça o existente.
    optimizePackageImports: ["motion", "lucide-react"],
  },
  images: {
    unoptimized: true,
  },
  async redirects() {
    // non-www → www, permanente (308). Obs.: se o apex estiver configurado como
    // "domínio de redirect" no painel da Vercel, ele é resolvido na borda antes de
    // chegar aqui — nesse caso ajustar a permanência também nas Settings → Domains.
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "aprovaoab.app.br" }],
        destination: "https://www.aprovaoab.app.br/:path*",
        permanent: true,
      },
    ]
  },
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://js.stripe.com https://accounts.google.com https://va.vercel-scripts.com https://www.googletagmanager.com https://*.clarity.ms",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://accounts.google.com https://oauth2.googleapis.com https://vitals.vercel-insights.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://*.clarity.ms https://c.bing.com",
      "frame-src https://js.stripe.com https://hooks.stripe.com https://accounts.google.com https://www.googletagmanager.com",
      "frame-ancestors 'none'",
      "form-action 'self' https://checkout.stripe.com",
      "base-uri 'self'",
      "object-src 'none'",
    ].join("; ")

    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
})
