"use client";

import Link, { useLinkStatus } from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import type { VariantProps } from "class-variance-authority";

import { Button, type buttonVariants } from "@/components/site/ui/button";
import { cn } from "@/lib/utils";

function CtaIndicator() {
  const { pending } = useLinkStatus();
  if (pending) {
    return (
      <Loader2
        role="status"
        aria-label="Carregando"
        className="size-4 animate-spin"
      />
    );
  }
  return (
    <ArrowRight
      className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
      aria-hidden
    />
  );
}

/**
 * CTA primário padrão: leva pra /cadastro com estado de carregamento real
 * (spinner enquanto a navegação está pendente — sem atraso artificial).
 */
export function CtaButton({
  label = "Começar grátis",
  size,
  variant,
  className,
}: {
  label?: string;
  className?: string;
} & VariantProps<typeof buttonVariants>) {
  return (
    <Button asChild size={size} variant={variant} className={cn("group", className)}>
      <Link href="/cadastro">
        {label}
        <CtaIndicator />
      </Link>
    </Button>
  );
}
