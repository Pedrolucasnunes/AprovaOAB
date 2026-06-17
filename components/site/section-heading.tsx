import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full bg-eyebrow px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-eyebrow-foreground",
        className
      )}
    >
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  lead,
  dark = false,
  center = false,
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  lead?: ReactNode;
  dark?: boolean;
  center?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn("max-w-2xl", center && "mx-auto text-center", className)}
    >
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2
        className={cn(
          "mt-5 font-display text-3xl leading-[1.12] tracking-tight text-balance sm:text-4xl lg:text-[2.75rem]",
          dark ? "text-night-foreground" : "text-foreground"
        )}
      >
        {title}
      </h2>
      {lead ? (
        <p
          className={cn(
            "mt-4 text-base leading-relaxed sm:text-lg",
            dark ? "text-night-muted" : "text-muted-foreground"
          )}
        >
          {lead}
        </p>
      ) : null}
    </div>
  );
}
