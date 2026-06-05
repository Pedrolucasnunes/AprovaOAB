// URL base canônica da aplicação, já sem espaços/quebras de linha acidentais na
// env var NEXT_PUBLIC_APP_URL. Use SEMPRE este helper em vez de ler
// process.env.NEXT_PUBLIC_APP_URL direto — assim um "\n" perdido na env (Vercel)
// nunca mais quebra links de email, redirects de OAuth, Stripe ou o sitemap.
export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://www.aprovaoab.app.br").trim()
