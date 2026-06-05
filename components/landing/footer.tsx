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

            {/* Redes sociais */}
            <div className="mt-5 flex items-center gap-3">
              <a
                href="https://www.instagram.com/aprovaoab.app/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="AprovaOAB no Instagram"
                className="text-muted-foreground transition-colors hover:text-primary"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.336 3.608 1.311.975.975 1.249 2.242 1.311 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.336 2.633-1.311 3.608-.975.975-2.242 1.249-3.608 1.311-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.336-3.608-1.311-.975-.975-1.249-2.242-1.311-3.608-.058-1.266-.07-1.646-.07-4.85s.012-3.584.07-4.85c.062-1.366.336-2.633 1.311-3.608.975-.975 2.242-1.249 3.608-1.311 1.266-.058 1.646-.07 4.85-.07zm0 1.802c-3.149 0-3.522.012-4.764.069-1.024.047-1.58.218-1.95.362-.49.19-.84.418-1.207.785-.367.367-.595.717-.785 1.207-.144.37-.315.926-.362 1.95-.057 1.242-.069 1.615-.069 4.764s.012 3.522.069 4.764c.047 1.024.218 1.58.362 1.95.19.49.418.84.785 1.207.367.367.717.595 1.207.785.37.144.926.315 1.95.362 1.242.057 1.615.069 4.764.069s3.522-.012 4.764-.069c1.024-.047 1.58-.218 1.95-.362.49-.19.84-.418 1.207-.785.367-.367.595-.717.785-1.207.144-.37.315-.926.362-1.95.057-1.242.069-1.615.069-4.764s-.012-3.522-.069-4.764c-.047-1.024-.218-1.58-.362-1.95-.19-.49-.418-.84-.785-1.207-.367-.367-.717-.595-1.207-.785-.37-.144-.926-.315-1.95-.362-1.242-.057-1.615-.069-4.764-.069zm0 3.064a5.971 5.971 0 100 11.942 5.971 5.971 0 000-11.942zm0 9.849a3.878 3.878 0 110-7.756 3.878 3.878 0 010 7.756zm7.604-10.05a1.394 1.394 0 11-2.788 0 1.394 1.394 0 012.788 0z" />
                </svg>
              </a>
              <a
                href="https://x.com/AprovaOAB_app"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="AprovaOAB no X (Twitter)"
                className="text-muted-foreground transition-colors hover:text-primary"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Produto */}
          <div>
            <p className="mb-4 text-sm font-semibold text-foreground">Produto</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/questoes" className="transition-opacity hover:opacity-80">
                  Questões da OAB
                </Link>
              </li>
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
