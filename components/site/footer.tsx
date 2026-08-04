import Link from "next/link";

import { CookiePreferencesTrigger } from "@/components/cookie-preferences-trigger";
import { Logo } from "@/components/site/logo";

// `route: true` = rota real (next/link). Âncoras usam "/#..." pra funcionar de
// qualquer página (na landing rolam; em /questoes navegam pra landing + seção).
const PRODUCT_LINKS = [
  { href: "/#como-funciona", label: "Como funciona" },
  { href: "/#beneficios", label: "Benefícios" },
  { href: "/questoes", label: "Questões grátis", route: true },
  { href: "/editais", label: "Editais", route: true },
  { href: "/#newsletter", label: "Newsletter" },
  { href: "/#planos", label: "Planos" },
  { href: "/#faq", label: "FAQ" },
];

const ACCOUNT_LINKS = [
  { href: "/cadastro", label: "Criar conta grátis" },
  { href: "/login", label: "Entrar" },
];

// Os mesmos perfis que o `sameAs` do Organization em app/layout.tsx — se um
// mudar, o outro muda junto (é o par que o Google usa pra casar o site com as
// contas). Ícones são SVG inline, como o do WhatsApp FAB: o lucide-react não
// traz marcas, e o `Twitter` que ele tem é o passarinho antigo.
const SOCIAL_LINKS = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/aprovaoab.app/",
    path: "M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z",
  },
  {
    label: "X",
    href: "https://x.com/AprovaOAB_app",
    path: "M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z",
  },
];

export function Footer() {
  return (
    <footer className="border-t border-night-border bg-night">
      <div className="container-page py-14">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-night-muted">
              Preparação pra 1ª fase do Exame de Ordem: diagnóstico por
              matéria, plano montado pelos seus erros e simulados no padrão
              FGV.
            </p>
            <p className="mt-4 font-mono text-xs text-night-muted">
              aprovaoab.app.br
            </p>

            {/* h-10/w-10 é o piso de alvo de toque (WCAG 2.5.8); o ícone dentro
                fica em 18px pra não encher o botão. */}
            <ul className="mt-5 flex items-center gap-2.5">
              {SOCIAL_LINKS.map((social) => (
                <li key={social.label}>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer me"
                    aria-label={`AprovaOAB no ${social.label}`}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-night-border text-night-muted transition-colors duration-200 hover:border-primary/50 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-night"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="h-[18px] w-[18px]"
                      aria-hidden="true"
                    >
                      <path d={social.path} />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <nav aria-label="Produto" className="md:col-span-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-night-muted">
              Produto
            </p>
            <ul className="mt-3 space-y-1">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.href}>
                  {link.route ? (
                    <Link
                      href={link.href}
                      className="block py-1 text-sm text-night-muted transition-colors duration-200 hover:text-night-foreground"
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      href={link.href}
                      className="block py-1 text-sm text-night-muted transition-colors duration-200 hover:text-night-foreground"
                    >
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Conta" className="md:col-span-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-night-muted">
              Conta
            </p>
            <ul className="mt-3 space-y-1">
              {ACCOUNT_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="block py-1 text-sm text-night-muted transition-colors duration-200 hover:text-night-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="md:col-span-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-night-muted">
              Comece hoje
            </p>
            <p className="mt-3 text-sm leading-relaxed text-night-muted">
              Diagnóstico completo no plano grátis, sem cartão de crédito.
            </p>
            <Link
              href="/cadastro"
              className="mt-3 inline-block text-sm font-semibold text-primary transition-colors duration-200 hover:text-night-foreground"
            >
              Criar conta grátis →
            </Link>
          </div>
        </div>

        <div className="mt-12 border-t border-night-border pt-6">
          <nav
            aria-label="Links legais"
            className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-night-muted"
          >
            <Link
              href="/termos-de-uso"
              className="transition-colors duration-200 hover:text-night-foreground"
            >
              Termos de uso
            </Link>
            <Link
              href="/politica-de-privacidade"
              className="transition-colors duration-200 hover:text-night-foreground"
            >
              Privacidade
            </Link>
            <CookiePreferencesTrigger className="hover:text-night-foreground" />
          </nav>

          <div className="mt-5 flex flex-col justify-between gap-3 sm:flex-row">
            <p className="text-xs text-night-muted">
              © 2026 AprovaOAB — feito no Brasil.
            </p>
            <p className="max-w-md text-xs leading-relaxed text-night-muted">
              Plataforma independente de estudos, sem vínculo com a OAB ou com a
              FGV.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
