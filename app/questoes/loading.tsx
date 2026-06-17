import { SeoShell } from "@/components/seo/seo-shell"

// Skeleton instantâneo na navegação pra /questoes (e segmentos aninhados).
// Sem isso, o clique fica sem feedback até o servidor responder — perceptível
// no `next dev` e durante a revalidação ISR em produção.
export default function Loading() {
  return (
    <SeoShell>
      <div className="animate-pulse">
        <div className="h-9 w-2/3 rounded-md bg-white/10" />
        <div className="mt-5 h-4 w-full rounded bg-white/[0.06]" />
        <div className="mt-2 h-4 w-5/6 rounded bg-white/[0.06]" />

        <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-[58px] rounded-xl border border-night-border bg-white/[0.04]"
            />
          ))}
        </div>
      </div>
    </SeoShell>
  )
}
