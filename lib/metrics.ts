// Fonte única da verdade das métricas de desempenho exibidas no app.
//
// Antes de existir este arquivo, cada tela definia seus próprios cortes
// ("crítica" era <25, <40, <55 ou <60 dependendo da página) e a META=50 era
// redeclarada 4×. Tudo que classifica ou colore uma taxa de acerto deve
// importar daqui — Dashboard, Desempenho, Treino, Agenda e rotas de API.

/** Meta de aprovação na 1ª fase da OAB: 50% de acerto (40/80). */
export const META_APROVACAO = 50

// Bandas canônicas de desempenho por matéria. São as mesmas da copy pública
// da Agenda Inteligente ("matérias críticas (<40% acerto)") e do gerador de
// plano (lib/services/agenda.ts / api/calendario/gerar).
export const TAXA_CRITICA = 40 // abaixo disso: crítica
export const TAXA_BOA = 70 // acima disso: boa; entre as duas: média

// Amostra mínima pra CLASSIFICAR uma matéria em banda (cards de contagem).
// Com 1-2 respostas, taxa é ruído (1 erro = 0% = "crítica"). Listas de
// recomendação NÃO usam esse piso — recomendar a partir de 1 erro é ok.
export const MIN_TENTATIVAS_BANDA = 3

export type NivelTaxa = "critica" | "media" | "boa"

export function classificarTaxa(taxa: number): NivelTaxa {
  if (taxa < TAXA_CRITICA) return "critica"
  if (taxa <= TAXA_BOA) return "media"
  return "boa"
}

/** Cor de texto para taxa POR MATÉRIA (bandas crítica/média/boa). */
export function taxaTextColor(taxa: number): string {
  const nivel = classificarTaxa(taxa)
  if (nivel === "critica") return "text-destructive"
  if (nivel === "media") return "text-amber-500"
  return "text-primary"
}

/** Cor de barra de progresso para taxa POR MATÉRIA. */
export function taxaBarColor(taxa: number): string {
  const nivel = classificarTaxa(taxa)
  if (nivel === "critica") return "bg-destructive"
  if (nivel === "media") return "bg-amber-500"
  return "bg-primary"
}

/** Rótulo curto da banda (badges de risco). */
export function taxaLabel(taxa: number): string {
  const nivel = classificarTaxa(taxa)
  if (nivel === "critica") return "crítico"
  if (nivel === "media") return "atenção"
  return "adequado"
}

// Para notas GERAIS comparadas à meta de aprovação (hero do dashboard, banner
// de simulados, % do último simulado): verde só quando a meta foi atingida,
// âmbar entre a banda crítica e a meta, vermelho na banda crítica.

export function metaTextColor(taxa: number): string {
  if (taxa >= META_APROVACAO) return "text-primary"
  if (taxa >= TAXA_CRITICA) return "text-amber-500"
  return "text-destructive"
}

export function metaBarColor(taxa: number): string {
  if (taxa >= META_APROVACAO) return "bg-primary"
  if (taxa >= TAXA_CRITICA) return "bg-amber-500"
  return "bg-destructive"
}
