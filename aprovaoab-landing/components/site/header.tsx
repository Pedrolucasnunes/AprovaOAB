"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Menu, X } from "lucide-react";

import { CtaButton } from "@/components/site/cta-button";
import { Logo } from "@/components/site/logo";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.21, 0.61, 0.35, 1];

const LINKS = [
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#beneficios", label: "Benefícios" },
  { href: "#planos", label: "Planos" },
  { href: "#faq", label: "FAQ" },
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
      initial={reduce ? false : { y: -24, opacity: 0 }}
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
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-night-muted transition-colors duration-200 hover:text-night-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
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
              {LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-2 py-2.5 text-sm text-night-muted transition-colors duration-200 hover:bg-white/5 hover:text-night-foreground"
                >
                  {link.label}
                </a>
              ))}
              <CtaButton size="sm" label="Começar grátis" className="mt-2" />
            </div>
          </motion.nav>
        ) : null}
      </AnimatePresence>
    </motion.header>
  );
}
