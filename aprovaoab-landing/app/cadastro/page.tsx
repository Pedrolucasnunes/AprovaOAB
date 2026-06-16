"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/site/logo";

function Field({
  id,
  label,
  type,
  placeholder,
  autoComplete,
}: {
  id: string;
  label: string;
  type: string;
  placeholder: string;
  autoComplete: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-night-muted"
      >
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        required
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full rounded-lg border border-night-border bg-night px-3.5 py-2.5 text-sm text-night-foreground outline-none transition-colors duration-200 placeholder:text-night-muted/50 focus:border-primary"
      />
    </div>
  );
}

export default function CadastroPage() {
  const [sent, setSent] = React.useState(false);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-night px-4 py-16">
      <Logo className="mb-8" />

      <main className="w-full max-w-sm rounded-2xl border border-night-border bg-night-card p-7">
        <h1 className="font-display text-2xl tracking-tight text-night-foreground">
          Criar conta grátis
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-night-muted">
          Diagnóstico completo e 10 questões por dia. Sem cartão de crédito.
        </p>

        {sent ? (
          <div className="mt-6 flex gap-3 rounded-lg border border-primary/30 bg-primary/10 p-4">
            <CheckCircle2 className="size-5 shrink-0 text-primary" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-night-foreground">
                Quase lá!
              </p>
              <p className="mt-1 text-xs leading-relaxed text-night-muted">
                Este é um protótipo de demonstração — o cadastro real ainda não
                está conectado.
              </p>
            </div>
          </div>
        ) : (
          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
            }}
          >
            <Field
              id="nome"
              label="Nome"
              type="text"
              placeholder="Seu nome"
              autoComplete="name"
            />
            <Field
              id="email"
              label="E-mail"
              type="email"
              placeholder="voce@exemplo.com.br"
              autoComplete="email"
            />
            <Field
              id="senha"
              label="Senha"
              type="password"
              placeholder="Mínimo de 8 caracteres"
              autoComplete="new-password"
            />
            <Button type="submit" className="w-full">
              Criar minha conta
            </Button>
          </form>
        )}
      </main>

      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-1.5 text-xs text-night-muted transition-colors duration-200 hover:text-night-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Voltar pra página inicial
      </Link>
    </div>
  );
}
