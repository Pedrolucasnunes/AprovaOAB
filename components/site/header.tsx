"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Menu, X } from "lucide-react";

import { CtaButton } from "@/components/site/cta-button";
import { Logo } from "@/components/site/logo";
import { Button } from "@/components/site/ui/button";
import { temDicaDeSessao } from "@/lib/sessao";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.21, 0.61, 0.35, 1];

// `route: true` = rota real (next/link). As âncoras usam "/#..." pra funcionar de
// qualquer página: na landing rolam suave; em /questoes navegam pra landing + seção.
const LINKS = [
  { href: "/#como-funciona", label: "Como funciona" },
  { href: "/#beneficios", label: "Benefícios" },
  { href: "/questoes", label: "Questões grátis", route: true },
  { href: "/provas", label: "Provas", route: true },
  { href: "/editais", label: "Editais", route: true },
  { href: "/#planos", label: "Planos" },
  { href: "/#faq", label: "FAQ" },
];

// `useSyncExternalStore` precisa das três funções com referência estável. Não há
// evento pra assinar: o cookie não muda enquanto a landing está aberta (quem
// faz login sai desta página), então a inscrição é um no-op e o snapshot é lido
// a cada render — parse de string, custo zero.
const semInscricao = () => () => {};
const dicaNoServidor = () => false;

/**
 * O par de botões de conta — um único lugar, usado no header e no menu móvel.
 *
 * Estava duplicado nos dois; com dois estados possíveis viraria quatro cópias, e
 * é assim que "Entrar" e "Meu dashboard" acabam discordando entre a barra e o
 * menu (o mesmo defeito que `iniciaisDoNome` teve em quatro arquivos).
 *
 * As classes são as originais de cada contexto, não uma unificação: no desktop
 * os dois botões são `hidden sm:inline-flex`; no menu móvel o secundário abre
 * com `mt-2` e o CTA logo abaixo com `mt-1.5`.
 */
function AcoesDeConta({
  logado,
  mobile,
  fecharMenu,
}: {
  logado: boolean;
  mobile?: boolean;
  fecharMenu?: () => void;
}) {
  const classeSecundaria = mobile ? "mt-2" : "hidden sm:inline-flex";
  const classeCta = mobile ? "mt-1.5" : "hidden sm:inline-flex";

  // Logado: um botão só. "Começar grátis" some porque a conta já existe, e
  // "Entrar" some porque é literalmente falso — o middleware já manda essa
  // pessoa pro dashboard se ela clicar. Ver `lib/sessao.ts`.
  if (logado) {
    return (
      <CtaButton
        size="sm"
        href="/dashboard"
        label="Meu dashboard"
        className={classeSecundaria}
      />
    );
  }

  return (
    <>
      <Button asChild variant="outlineDark" size="sm" className={classeSecundaria}>
        <Link href="/login" onClick={fecharMenu}>
          Entrar
        </Link>
      </Button>
      <CtaButton size="sm" label="Começar grátis" className={classeCta} />
    </>
  );
}

export function Header() {
  const reduce = useReducedMotion();
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  // `useSyncExternalStore` e não `useState` + `useEffect`: é a API que o React
  // tem pra ler valor que só existe no cliente sem mismatch de hidratação. O
  // terceiro argumento é o snapshot do SERVIDOR, e ele é `false` de propósito —
  // o HTML prerenderizado tem que sair no estado deslogado, que é o certo pros
  // 100% de tráfego anônimo de SEO. A correção vem logo depois da hidratação,
  // lendo o cookie (síncrono, sem rede, sem `navigator.locks`).
  //
  // Se a dica estiver velha (sessão expirada, logout em outra aba), o clique cai
  // no middleware, que valida o JWT de verdade e manda pro login: o pior caso é
  // exatamente o comportamento de hoje.
  const logado = React.useSyncExternalStore(
    semInscricao,
    temDicaDeSessao,
    dicaNoServidor
  );

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      // Above-the-fold: renderiza visível na primeira pintura (sem esconder até
      // hidratar). O fade-in de entrada do header fica de fora pra não atrasar o FCP.
      initial={false}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.55, ease: EASE }}
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300",
        scrolled || open
          ? "border-night-border bg-night/85 backdrop-blur-md"
          : "border-transparent bg-transparent"
      )}
    >
      <div className="container-page flex h-16 items-center justify-between">
        <Logo />

        <nav
          aria-label="Navegação principal"
          className="hidden items-center gap-7 md:flex"
        >
          {LINKS.map((link) => {
            const cls =
              "text-sm text-night-muted transition-colors duration-200 hover:text-night-foreground";
            return link.route ? (
              <Link key={link.href} href={link.href} className={cls}>
                {link.label}
              </Link>
            ) : (
              <a key={link.href} href={link.href} className={cls}>
                {link.label}
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <AcoesDeConta logado={logado} />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-night-border text-night-foreground transition-colors duration-200 hover:bg-white/5 md:hidden"
          >
            {open ? (
              <X className="size-4" aria-hidden />
            ) : (
              <Menu className="size-4" aria-hidden />
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.nav
            aria-label="Menu móvel"
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="overflow-hidden border-t border-night-border bg-night/95 backdrop-blur-md md:hidden"
          >
            <div className="container-page flex flex-col gap-1 py-4">
              {LINKS.map((link) => {
                const cls =
                  "rounded-md px-2 py-2.5 text-sm text-night-muted transition-colors duration-200 hover:bg-white/5 hover:text-night-foreground";
                return link.route ? (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={cls}
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={cls}
                  >
                    {link.label}
                  </a>
                );
              })}
              <AcoesDeConta logado={logado} mobile fecharMenu={() => setOpen(false)} />
            </div>
          </motion.nav>
        ) : null}
      </AnimatePresence>
    </motion.header>
  );
}
