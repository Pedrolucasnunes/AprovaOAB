import Link from "next/link";
import { Scale } from "lucide-react";

import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="AprovaOAB — voltar ao início"
      className={cn("flex w-fit items-center gap-2.5", className)}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Scale className="size-4" aria-hidden />
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-night-foreground">
        Aprova<span className="text-primary">OAB</span>
      </span>
    </Link>
  );
}
