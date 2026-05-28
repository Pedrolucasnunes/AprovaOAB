import Link from "next/link"

import { CookiePreferencesTrigger } from "@/components/cookie-preferences-trigger"

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID

export function Footer() {
  return (
    <footer className="border-t border-border py-14">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">

        {/* 4-column grid */}
        <div className="grid gap-8 md:grid-cols-4">

          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2">
              <img src="/Sem fundo.png" alt="AprovaOAB" className="h-7 w-7 object-contain" />
              <span
                className="text-xl font-bold tracking-tight"
                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
              >
                <span className="text-primary">aprova</span>
                <span className="text-foreground/70">OAB</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Estude com foco no que cai. Feito por advogados e engenheiros no Brasil.
            </p>
          </div>

          {/* Produto */}
          <div>
            <p className="mb-4 text-sm font-semibold text-foreground">Produto</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="#como-funciona" className="transition-opacity hover:opacity-80">
                  Como funciona
                </Link>
              </li>
              <li>
                <Link href="#diferenciais" className="transition-opacity hover:opacity-80">
                  Diferenciais
                </Link>
              </li>
              <li>
                <Link href="#planos" className="transition-opacity hover:opacity-80">
                  Planos
                </Link>
              </li>
            </ul>
          </div>

          {/* Empresa */}
          <div>
            <p className="mb-4 text-sm font-semibold text-foreground">Empresa</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="#" className="transition-opacity hover:opacity-80">
                  Sobre
                </Link>
              </li>
              <li>
                <Link href="#" className="transition-opacity hover:opacity-80">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="#" className="transition-opacity hover:opacity-80">
                  Contato
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="mb-4 text-sm font-semibold text-foreground">Legal</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/termos-de-uso" className="transition-opacity hover:opacity-80">
                  Termos de uso
                </Link>
              </li>
              <li>
                <Link href="/politica-de-privacidade" className="transition-opacity hover:opacity-80">
                  Privacidade
                </Link>
              </li>
              {GTM_ID && (
                <li>
                  <CookiePreferencesTrigger />
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 border-t border-border pt-6 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} aprovaOAB · Todos os direitos reservados</p>
        </div>

      </div>
    </footer>
  )
}
