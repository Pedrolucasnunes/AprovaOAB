import Link from "next/link"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ArrowLeft, Check } from "lucide-react"
import { SeoShell } from "@/components/seo/seo-shell"
import { SeoCtaButton } from "@/components/seo/seo-cta"
import { JsonLd } from "@/components/seo/json-ld"
import { getExame, listarExames, parseExameSlug } from "@/lib/seo/provas"
import { breadcrumb, collectionPage, itemList } from "@/lib/seo/jsonld"
import { questionSlug } from "@/lib/slug"
import { OG_BASE } from "@/lib/seo/og"

export const revalidate = 86400

// Com `revalidate` no segmento, o Next 16.1.6 responde 200 ao `notFound()` — um
// soft 404: conteúdo de "não encontrado" servido como página válida, que o Google
// indexa. Com `dynamicParams = false` o próprio roteador devolve 404 real para
// qualquer edição fora do build, sem chegar a executar esta página.
//
// A troca é aceitável aqui porque o conjunto de exames é integralmente conhecido
// no build: prova nova entra por importação em lote, que já vem com deploy junto.
export const dynamicParams = false

export async function generateStaticParams() {
  const exames = await listarExames()
  return exames.map((e) => ({ exame: e.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ exame: string }>
}): Promise<Metadata> {
  const { exame } = await params
  const numero = parseExameSlug(exame)
  const dados = numero === null ? null : await getExame(numero)
  if (!dados) return {}

  const title = `${dados.numero}º Exame OAB — prova e gabarito (${dados.ano})`
  const description =
    `Prova completa do ${dados.numero}º Exame de Ordem (${dados.romano}, ${dados.ano}): ` +
    `${dados.totalQuestoes} questões de ${dados.totalMaterias} matérias, com enunciado, ` +
    `alternativas e gabarito. Resolva de graça no AprovaOAB.`
  const canonical = `/provas/${dados.slug}`
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { ...OG_BASE, title, description, url: canonical },
  }
}

export default async function ProvaPage({
  params,
}: {
  params: Promise<{ exame: string }>
}) {
  const { exame } = await params
  const numero = parseExameSlug(exame)
  if (numero === null) notFound()

  const dados = await getExame(numero)
  if (!dados) notFound()

  // Vizinhos por número de edição — a lista vem ordenada da mais recente pra mais
  // antiga. Serve de linkagem interna: sem isso cada prova seria uma folha solta,
  // alcançável só pelo hub.
  const exames = await listarExames()
  const i = exames.findIndex((e) => e.numero === dados.numero)
  const maisRecente = i > 0 ? exames[i - 1] : null
  const maisAntigo = i >= 0 && i < exames.length - 1 ? exames[i + 1] : null

  // JSON-LD: breadcrumb + coleção + índice das matérias.
  //
  // Deliberadamente SEM `Quiz`/`Question` aqui, embora a página de questão avulsa
  // publique. O schema exige repetir enunciado e alternativas dentro do JSON, o que
  // duplicaria o corpo inteiro da página (~80 questões) sem rich result adicional —
  // o de "practice problems" já é servido pelas páginas individuais.
  const jsonLd = [
    collectionPage({
      name: `${dados.numero}º Exame de Ordem — prova e gabarito`,
      description: `Prova completa do ${dados.numero}º Exame de Ordem Unificado (${dados.ano}), com gabarito.`,
      path: `/provas/${dados.slug}`,
    }),
    breadcrumb([
      { name: "Provas da OAB", path: "/provas" },
      { name: `${dados.numero}º Exame de Ordem`, path: `/provas/${dados.slug}` },
    ]),
    itemList(
      `Matérias do ${dados.numero}º Exame`,
      dados.grupos.map((g) => ({
        name: g.subjectName,
        path: `/provas/${dados.slug}#${g.subjectSlug}`,
      })),
    ),
  ]

  return (
    <SeoShell>
      <JsonLd data={jsonLd} />

      <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/provas" className="inline-flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Provas da OAB
        </Link>
      </nav>

      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {dados.numero}º Exame da OAB — prova e gabarito
      </h1>

      <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
        Prova objetiva (1ª fase) do {dados.numero}º Exame de Ordem Unificado, aplicada em{" "}
        {dados.ano} e também chamada de {dados.romano} Exame. Abaixo estão as{" "}
        <strong className="font-semibold text-foreground">
          {dados.totalQuestoes} questões
        </strong>{" "}
        disponíveis no AprovaOAB, de {dados.totalMaterias} matérias, com as alternativas e o
        gabarito de cada uma.
      </p>

      {/* Duas ressalvas que o dado impõe. Sem elas a página afirmaria coisas que o
          banco não sustenta: a FGV numera as questões de 1 a 80 e nós não guardamos
          essa posição; e nem toda edição está completa no banco. */}
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        As questões estão agrupadas por matéria, não na ordem original da prova — a numeração
        da FGV não é reproduzida aqui.
        {dados.totalQuestoes < 80 && (
          <>
            {" "}
            Esta edição teve 80 questões na aplicação; {dados.totalQuestoes} estão disponíveis
            no banco.
          </>
        )}
      </p>

      {/* Índice — dá acesso direto à matéria e encurta a profundidade de rastreio */}
      <nav aria-label="Matérias desta prova" className="mt-8 flex flex-wrap gap-2">
        {dados.grupos.map((g) => (
          <a
            key={g.subjectSlug}
            href={`#${g.subjectSlug}`}
            className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            {g.subjectName}{" "}
            <span className="font-mono text-muted-foreground">({g.questoes.length})</span>
          </a>
        ))}
      </nav>

      {dados.grupos.map((g) => (
        <section key={g.subjectSlug} id={g.subjectSlug} className="mt-12 scroll-mt-28">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3">
            <h2 className="text-xl font-semibold text-foreground">
              {g.subjectName}
              <span className="ml-2 font-mono text-sm font-normal text-muted-foreground">
                {g.questoes.length}{" "}
                {g.questoes.length === 1 ? "questão" : "questões"}
              </span>
            </h2>
            <Link
              href={`/questoes/${g.subjectSlug}`}
              className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              Mais questões de {g.subjectName}
            </Link>
          </div>

          <div className="mt-6 space-y-8">
            {g.questoes.map((q) => {
              const alternativas = [
                { letra: "A", texto: q.alternativa_a },
                { letra: "B", texto: q.alternativa_b },
                { letra: "C", texto: q.alternativa_c },
                { letra: "D", texto: q.alternativa_d },
              ]
              return (
                <article
                  key={q.id}
                  className="rounded-xl border border-border bg-card p-5"
                >
                  {q.topicName && (
                    <p className="mb-3 font-mono text-xs text-muted-foreground">
                      {q.topicName}
                      {q.dificuldade && ` · ${q.dificuldade}`}
                    </p>
                  )}

                  <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                    {q.enunciado}
                  </p>

                  {/* Gabarito revelado, ao contrário da página de questão avulsa (onde
                      só aparece depois de responder). Aqui a intenção de busca É o
                      gabarito — esconder seria esconder o que a pessoa veio ver. A
                      resolução comentada continua atrás do cadastro nos dois casos. */}
                  <ul className="mt-4 space-y-2">
                    {alternativas.map((a) => {
                      const correta = a.letra === q.resposta_correta
                      return (
                        <li
                          key={a.letra}
                          className={`flex gap-3 rounded-lg border px-3 py-2 text-sm leading-relaxed ${
                            correta
                              ? "border-primary/40 bg-primary/10 text-foreground"
                              : "border-transparent text-muted-foreground"
                          }`}
                        >
                          <span
                            className={`font-mono font-semibold ${
                              correta ? "text-primary" : "text-muted-foreground"
                            }`}
                          >
                            {a.letra}
                          </span>
                          <span className="min-w-0 flex-1">{a.texto}</span>
                          {correta && (
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                          )}
                        </li>
                      )
                    })}
                  </ul>

                  <p className="mt-3 text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      Gabarito: {q.resposta_correta}
                    </span>
                    {q.temPagina && (
                      <>
                        {" · "}
                        <Link
                          href={`/questoes/${q.subjectSlug}/${questionSlug(q)}`}
                          className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
                        >
                          resolver esta questão
                        </Link>
                      </>
                    )}
                  </p>
                </article>
              )
            })}
          </div>
        </section>
      ))}

      {(maisRecente || maisAntigo) && (
        <nav className="mt-14 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {maisAntigo && (
            <Link
              href={`/provas/${maisAntigo.slug}`}
              className="rounded-xl border border-border bg-card px-5 py-4 transition-colors hover:border-primary/40 hover:bg-muted/40"
            >
              <span className="block font-mono text-xs text-muted-foreground">
                Exame anterior
              </span>
              <span className="mt-1 block font-medium text-foreground">
                {maisAntigo.numero}º Exame de Ordem ({maisAntigo.ano})
              </span>
            </Link>
          )}
          {maisRecente && (
            <Link
              href={`/provas/${maisRecente.slug}`}
              className="rounded-xl border border-border bg-card px-5 py-4 transition-colors hover:border-primary/40 hover:bg-muted/40 sm:text-right"
            >
              <span className="block font-mono text-xs text-muted-foreground">
                Exame seguinte
              </span>
              <span className="mt-1 block font-medium text-foreground">
                {maisRecente.numero}º Exame de Ordem ({maisRecente.ano})
              </span>
            </Link>
          )}
        </nav>
      )}

      <div className="mt-12 rounded-2xl border border-border bg-muted/20 p-6 text-center">
        <p className="text-lg font-semibold text-foreground">
          Já sabe o gabarito. Sabe por que errou?
        </p>
        <p className="mt-1 mb-5 text-sm text-muted-foreground">
          No AprovaOAB cada questão vem com resolução comentada, e o diagnóstico mostra em quais
          matérias você precisa focar antes da prova.
        </p>
        <SeoCtaButton location="prova_rodape" />
      </div>
    </SeoShell>
  )
}
