import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="AprovaOAB — voltar ao início"
      className={cn("flex w-fit items-center gap-2.5", className)}
    >
      <Image
        src="/Sem fundo.png"
        alt="AprovaOAB"
        width={32}
        height={32}
        className="h-8 w-8 object-contain"
        priority
      />
      <span className="text-[15px] font-semibold tracking-tight text-night-foreground">
        Aprova<span className="text-primary">OAB</span>
      </span>
    </Link>
  );
}
