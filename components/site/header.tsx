"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Menu, X } from "lucide-react";

import { CtaButton } from "@/components/site/cta-button";
import { Logo } from "@/components/site/logo";
import { Button } from "@/components/site/ui/button";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.21, 0.61, 0.35, 1];

// `route: true` = rota real (next/link). As âncoras usam "/#..." pra funcionar de
// qualquer página: na landing rolam suave; em /questoes navegam pra landing + seção.
const LINKS = [
  { href: "/#como-funciona", label: "Como funciona" },
  { href: "/#beneficios", label: "Benefícios" },
  { href: "/questoes", label: "Questões grátis", route: true },
  { href: "/editais", label: "Editais", route: true },
  { href: "/#planos", label: "Planos" },
  { href: "/#faq", label: "FAQ" },
];

export function Header() {
  const reduce = useReducedMotion();
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);

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
          <Button
            asChild
            variant="outlineDark"
            size="sm"
            className="hidden sm:inline-flex"
          >
            <Link href="/login">Entrar</Link>
          </Button>
          <CtaButton
            size="sm"
            label="Começar grátis"
            className="hidden sm:inline-flex"
          />
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
              <Button
                asChild
                variant="outlineDark"
                size="sm"
                className="mt-2"
              >
                <Link href="/login" onClick={() => setOpen(false)}>
                  Entrar
                </Link>
              </Button>
              <CtaButton size="sm" label="Começar grátis" className="mt-1.5" />
            </div>
          </motion.nav>
        ) : null}
      </AnimatePresence>
    </motion.header>
  );
}
