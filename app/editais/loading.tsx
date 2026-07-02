import { SeoShell } from "@/components/seo/seo-shell"

// Skeleton instantâneo na navegação pra /editais (e segmentos aninhados).
export default function Loading() {
  return (
    <SeoShell>
      <div className="animate-pulse">
        <div className="h-9 w-2/3 rounded-md bg-white/10" />
        <div className="mt-5 h-4 w-full rounded bg-white/[0.06]" />
        <div className="mt-2 h-4 w-5/6 rounded bg-white/[0.06]" />

        <div className="mt-10 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-11 rounded-lg border border-night-border bg-white/[0.04]" />
          ))}
        </div>
      </div>
    </SeoShell>
  )
}
