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
