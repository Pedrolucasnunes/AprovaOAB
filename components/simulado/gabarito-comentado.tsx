"use client"

import { useMemo, useState } from "react"
import { Check, X } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { contarEstados, estadoDoItem, type EstadoItem, type ItemGabarito } from "@/lib/simulado-resultado"
import { cn } from "@/lib/utils"

interface GabaritoComentadoProps {
  gabarito: ItemGabarito[]
  /** Sem `ordem` no banco não existe "questão 7"; a numeração é escondida. */
  temOrdem: boolean
}

type Filtro = EstadoItem | "todas"

const TODAS_AS_AREAS = "todas"

const ROTULO_ESTADO: Record<EstadoItem, string> = {
  acerto: "Acertou",
  erro: "Errou",
  branco: "Em branco",
}

/**
 * O gabarito com a explicação de cada questão.
 *
 * A tela antiga abria as 80 de uma vez, com o enunciado cortado em duas linhas
 * e sem explicação nenhuma — 80 cartões que não davam pra ler e não ensinavam
 * nada. Aqui a lista começa filtrada nos ERROS, que é o que se revisa depois de
 * uma prova; ver tudo é um clique.
 */
export function GabaritoComentado({ gabarito, temOrdem }: GabaritoComentadoProps) {
  const contagem = contarEstados(gabarito)
  const [filtro, setFiltro] = useState<Filtro>(contagem.erros > 0 ? "erro" : "todas")
  const [area, setArea] = useState<string>(TODAS_AS_AREAS)
  const [abertos, setAbertos] = useState<string[]>([])

  const areas = useMemo(() => {
    const nomes = [...new Set(gabarito.map((item) => item.subjectName))]
    return nomes.sort((a, b) => a.localeCompare(b, "pt-BR"))
  }, [gabarito])

  const visiveis = useMemo(
    () =>
      [...gabarito]
        .sort((a, b) => a.ordem - b.ordem)
        .filter((item) => filtro === "todas" || estadoDoItem(item) === filtro)
        .filter((item) => area === TODAS_AS_AREAS || item.subjectName === area),
    [gabarito, filtro, area],
  )

  const filtros: { chave: Filtro; rotulo: string; contagem: number }[] = [
    { chave: "erro", rotulo: "Erros", contagem: contagem.erros },
    { chave: "branco", rotulo: "Em branco", contagem: contagem.brancos },
    { chave: "acerto", rotulo: "Acertos", contagem: contagem.acertos },
    { chave: "todas", rotulo: "Todas", contagem: contagem.total },
  ]

  const todosAbertos = abertos.length === visiveis.length && visiveis.length > 0
  const comExplicacao = gabarito.filter((item) => item.explicacao?.trim()).length

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground">Gabarito comentado</h2>
        <button
          type="button"
          onClick={() => setAbertos(todosAbertos ? [] : visiveis.map((i) => i.questionId))}
          disabled={visiveis.length === 0}
          className="cursor-pointer text-sm text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
        >
          {todosAbertos ? "Recolher todas" : "Expandir todas"}
        </button>
      </div>

      {/* A cobertura vai impressa porque o título promete comentário e o banco
          não tem pra todas: 820 das 2.152 questões estavam sem `explicacao` em
          set/2026 (38%). Dizer "comentado" e abrir numa questão muda quebra a
          confiança na tela inteira; declarar o número não. Quando a cobertura
          fechar em 100%, a linha some sozinha. */}
      {comExplicacao < gabarito.length && (
        <p className="mb-4 text-sm text-muted-foreground">
          {comExplicacao} das {gabarito.length} questões têm explicação cadastrada.
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {filtros.map((f) => (
            <button
              key={f.chave}
              type="button"
              onClick={() => {
                setFiltro(f.chave)
                setAbertos([])
              }}
              aria-pressed={filtro === f.chave}
              className={cn(
                "cursor-pointer rounded-lg border px-3 py-1.5 text-sm transition-colors",
                filtro === f.chave
                  ? "border-primary/60 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {f.rotulo}{" "}
              <span className="text-xs tabular-nums opacity-70">{f.contagem}</span>
            </button>
          ))}
        </div>

        <Select
          value={area}
          onValueChange={(valor) => {
            setArea(valor)
            setAbertos([])
          }}
        >
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODAS_AS_AREAS}>Todas as áreas</SelectItem>
            {areas.map((nome) => (
              <SelectItem key={nome} value={nome}>
                {nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {visiveis.length}{" "}
          {visiveis.length === 1 ? "questão exibida" : "questões exibidas"}
        </span>
      </div>

      {visiveis.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Nenhuma questão com esses filtros.
        </p>
      ) : (
        <Accordion type="multiple" value={abertos} onValueChange={setAbertos}>
          {visiveis.map((item) => {
            const estado = estadoDoItem(item)
            const alternativas = [
              { letra: "A", texto: item.alternativaA },
              { letra: "B", texto: item.alternativaB },
              { letra: "C", texto: item.alternativaC },
              { letra: "D", texto: item.alternativaD },
            ]

            return (
              <AccordionItem key={item.questionId} value={item.questionId}>
                {/* `min-w-0` no gatilho é obrigatório: o `AccordionTrigger` do
                    shadcn é `flex-1` sem ele, e item flex não encolhe abaixo do
                    conteúdo — o enunciado de uma linha empurrava a página
                    inteira pra 7500px de largura em vez de truncar. */}
                <AccordionTrigger className="min-w-0 hover:no-underline">
                  <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="flex shrink-0 items-center gap-2">
                      {temOrdem && (
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {item.ordem + 1}
                        </span>
                      )}
                      <Badge variant="secondary" className="text-[0.65rem] font-normal">
                        {item.subjectName}
                      </Badge>
                    </div>

                    <p className="min-w-0 flex-1 truncate text-sm font-normal text-foreground">
                      {item.enunciado}
                    </p>

                    <div className="flex shrink-0 items-center gap-3 text-xs">
                      <span className="text-muted-foreground">
                        {item.respostaUsuario ? (
                          <>
                            sua{" "}
                            <strong
                              className={
                                estado === "acerto" ? "text-primary" : "text-destructive"
                              }
                            >
                              {item.respostaUsuario}
                            </strong>
                          </>
                        ) : (
                          "não respondida"
                        )}
                      </span>
                      <span className="text-muted-foreground">
                        correta <strong className="text-primary">{item.respostaCorreta}</strong>
                      </span>
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[0.65rem] font-medium",
                          estado === "acerto" && "bg-primary/10 text-primary",
                          estado === "erro" && "bg-destructive/10 text-destructive",
                          estado === "branco" && "bg-muted text-muted-foreground",
                        )}
                      >
                        {ROTULO_ESTADO[estado]}
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>

                <AccordionContent>
                  <p className="mb-4 text-sm leading-relaxed whitespace-pre-line text-foreground">
                    {item.enunciado}
                  </p>

                  <ul className="mb-4 space-y-2">
                    {alternativas.map(({ letra, texto }) => {
                      const ehCorreta = letra === item.respostaCorreta
                      const ehDoUsuario = letra === item.respostaUsuario

                      return (
                        <li
                          key={letra}
                          className={cn(
                            "flex gap-3 rounded-lg border p-3 text-sm",
                            ehCorreta && "border-primary/40 bg-primary/5",
                            !ehCorreta && ehDoUsuario && "border-destructive/40 bg-destructive/5",
                            !ehCorreta && !ehDoUsuario && "border-border",
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border font-mono text-xs font-semibold",
                              ehCorreta && "border-primary bg-primary text-primary-foreground",
                              !ehCorreta &&
                                ehDoUsuario &&
                                "border-destructive bg-destructive text-white",
                              !ehCorreta && !ehDoUsuario && "border-border text-muted-foreground",
                            )}
                          >
                            {letra}
                          </span>
                          <span className="min-w-0 flex-1 leading-relaxed text-foreground">
                            {texto}
                          </span>
                          {ehCorreta && <Check className="h-4 w-4 shrink-0 text-primary" />}
                          {!ehCorreta && ehDoUsuario && (
                            <X className="h-4 w-4 shrink-0 text-destructive" />
                          )}
                        </li>
                      )
                    })}
                  </ul>

                  <div className="rounded-lg border border-border bg-muted/40 p-4">
                    {item.explicacao?.trim() ? (
                      <p className="text-sm leading-relaxed whitespace-pre-line text-foreground">
                        {item.explicacao}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Esta questão ainda não tem explicação cadastrada.
                      </p>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      )}
    </section>
  )
}
