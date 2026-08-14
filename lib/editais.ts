// Fonte de dados das páginas públicas de SEO de editais da OAB (/editais).
//
// Dado ESTÁTICO e versionado no git — sem banco, sem admin. Editar aqui e abrir
// PR a cada novo exame (mesmo fluxo editorial da newsletter em lib/newsletter.ts).
//
// REGRA INEGOCIÁVEL: toda data/valor vem do EDITAL OFICIAL FGV/OAB verificado,
// nunca inventado. O 47º abaixo foi conferido no comunicado oficial da OAB
// (oab.org.br/noticia/64207) e no cronograma detalhado da Prova da Ordem
// (provadaordem.com.br/blog/post/edital-oab-47). Revisar contra o edital da FGV
// antes de publicar qualquer mudança.

import { ymdBrasil } from "./datas"

export type EditalEtapa = {
  label: string
  data: string // exibição, "06/09/2026"
  obs?: string
  destaque?: boolean // realça a linha (ex.: 1ª fase)
}

export type EditalFaq = {
  pergunta: string
  resposta: string
}

export type Edital = {
  slug: string // usado na URL: "47-exame-oab"
  numero: number // 47
  ordinal: string // "47º"
  ano: number // 2026
  publicado: boolean // o edital oficial já saiu? (false → página de "previsão")
  taxaInscricao: string // "R$ 350,00"
  fonteOficialUrl: string // link pro edital/calendário oficial (nunca hospedar o PDF)
  atualizadoEm: string // ISO — data da última revisão manual deste registro
  dataPrimeiraFase: string // ISO "2026-09-06" (schema.org Event + metadata + contagem)
  dataSegundaFase: string // ISO "2026-10-18"
  resumo: string
  cronograma: EditalEtapa[]
  checklist: string[]
  faq: EditalFaq[]
}

const EDICAO_47: Edital = {
  slug: "47-exame-oab",
  numero: 47,
  ordinal: "47º",
  ano: 2026,
  publicado: true,
  taxaInscricao: "R$ 350,00",
  // Página oficial do 47º Exame no portal da FGV (banca). O link direto pro PDF
  // do edital de abertura tem ID que muda a cada exame e o site é dinâmico —
  // por isso apontamos pra página do exame, onde a FGV publica todos os documentos.
  fonteOficialUrl: "https://oab.fgv.br/home.aspx?key=650",
  atualizadoEm: "2026-07-02",
  dataPrimeiraFase: "2026-09-06",
  dataSegundaFase: "2026-10-18",
  resumo:
    "O edital do 47º Exame de Ordem Unificado foi publicado pela FGV em 25 de maio de 2026, " +
    "com inscrições de 1º a 8 de junho. A 1ª fase (prova objetiva) acontece em 6 de setembro de " +
    "2026 e a 2ª fase (prova prático-profissional) em 18 de outubro de 2026. Abaixo você encontra " +
    "o cronograma completo com todas as datas oficiais, a taxa de inscrição e as principais dúvidas.",
  cronograma: [
    { label: "Publicação do edital de abertura", data: "25/05/2026" },
    { label: "Período de inscrições", data: "1º a 08/06/2026" },
    { label: "Solicitação de isenção da taxa", data: "1º a 08/06/2026" },
    { label: "Resultado preliminar da isenção", data: "06/07/2026" },
    { label: "Publicação do edital complementar", data: "24/07/2026" },
    { label: "Resultado definitivo da isenção", data: "29/07/2026" },
    { label: "Prazo limite para pagamento da taxa", data: "31/07/2026" },
    { label: "Divulgação dos locais de prova (1ª fase)", data: "31/08/2026" },
    { label: "1ª fase — Prova Objetiva", data: "06/09/2026", destaque: true },
    { label: "Gabarito preliminar da 1ª fase", data: "06/09/2026" },
    { label: "Gabarito definitivo e resultado preliminar da 1ª fase", data: "23/09/2026" },
    { label: "Resultado final da 1ª fase", data: "05/10/2026" },
    { label: "Divulgação dos locais de prova (2ª fase)", data: "09/10/2026" },
    { label: "2ª fase — Prova Prático-Profissional", data: "18/10/2026", destaque: true },
    { label: "Resultado preliminar da 2ª fase", data: "12/11/2026" },
    { label: "Resultado final do Exame", data: "03/12/2026" },
  ],
  checklist: [
    "Acesse o site oficial da FGV (oab.fgv.br) durante o período de inscrição.",
    "Crie ou atualize seu cadastro com os dados pessoais e o documento de identidade.",
    "Preencha a ficha de inscrição e escolha a cidade onde deseja fazer a prova.",
    "Se for o caso, solicite a isenção da taxa dentro do prazo (mesma janela da inscrição).",
    "Gere e pague o boleto da taxa até o prazo limite — sem o pagamento, a inscrição não é confirmada.",
  ],
  faq: [
    {
      pergunta: "Quando é a prova da 1ª fase do 47º Exame da OAB?",
      resposta:
        "A 1ª fase (prova objetiva) do 47º Exame de Ordem será aplicada em 6 de setembro de 2026, " +
        "conforme o cronograma da FGV.",
    },
    {
      pergunta: "Quanto custa a inscrição no 47º Exame de Ordem?",
      resposta:
        "A taxa de inscrição é de R$ 350,00, com prazo limite de pagamento até 31 de julho de 2026.",
    },
    {
      pergunta: "Quando sai o resultado da 1ª fase do 47º Exame?",
      resposta:
        "O resultado preliminar da 1ª fase está previsto para 23 de setembro de 2026 e o resultado " +
        "final para 5 de outubro de 2026. A 2ª fase acontece em 18 de outubro de 2026.",
    },
    {
      pergunta: "Qual é a nota de corte da 1ª fase da OAB?",
      resposta:
        "A 1ª fase tem 80 questões de múltipla escolha. É preciso acertar pelo menos 40 (50%) para " +
        "ser aprovado e avançar à 2ª fase.",
    },
    {
      pergunta: "As inscrições do 47º Exame ainda estão abertas?",
      resposta:
        "As inscrições regulares ocorreram de 1º a 8 de junho de 2026 e já foram encerradas. " +
        "Candidatos aprovados na 1ª fase do 46º Exame podem se inscrever para reaproveitamento entre " +
        "31 de julho e 7 de agosto de 2026, conforme o edital complementar de 24 de julho.",
    },
  ],
}

export const EDITAIS: Edital[] = [EDICAO_47]

/** Todos os editais, do mais recente pro mais antigo. */
export function getEditais(): Edital[] {
  return [...EDITAIS].sort((a, b) => b.numero - a.numero)
}

/** Um edital pelo slug da URL, ou null se não existir. */
export function getEditalBySlug(slug: string): Edital | null {
  return EDITAIS.find((e) => e.slug === slug) ?? null
}

export type ProximaProva = {
  ordinal: string // "47º"
  slug: string // "47-exame-oab" — link pro edital
  data: string // ISO "2026-09-06"
  diasRestantes: number // 0 = é hoje
  /** `oficial` = calendário da FGV. `usuario` = a data que a pessoa declarou. */
  origem: "oficial" | "usuario"
}

/**
 * A próxima 1ª fase, ou `null` quando não há nenhuma no futuro.
 *
 * **O `null` é a parte que importa.** `EDITAIS` hoje tem uma única edição (a
 * 47ª, 06/09/2026): a partir de 07/09/2026 esta função devolve `null` e quem
 * consome tem que sumir da tela. Sem isso o dashboard passaria a anunciar
 * "faltam -3 dias" e ninguém perceberia — nada quebra, nada falha no build,
 * só o número fica errado. É o mesmo raciocínio do `lastModified` ausente no
 * sitemap: campo vazio vale mais que campo inventado.
 *
 * A 1ª fase é data nacional única, então o calendário oficial é o default
 * correto pra todo mundo. `examDateDoUsuario` só sobrepõe quando é data
 * COMPLETA (`YYYY-MM-DD`): `/api/user/exam-date` também aceita `YYYY-MM`, e
 * mês solto não vira contagem regressiva.
 *
 * Pura e sem I/O — `EDITAIS` é dado estático versionado no git.
 */
export function proximaPrimeiraFase(
  examDateDoUsuario?: string | null,
  hoje: Date = new Date(),
): ProximaProva | null {
  const hojeYmd = ymdBrasil(hoje)

  const futuras = EDITAIS.filter((e) => e.dataPrimeiraFase >= hojeYmd).sort((a, b) =>
    a.dataPrimeiraFase < b.dataPrimeiraFase ? -1 : 1,
  )
  const oficial = futuras[0]

  // Data completa declarada pelo usuário e ainda no futuro tem prioridade: é
  // afirmação dele sobre a prova dele.
  if (examDateDoUsuario && DATA_COMPLETA.test(examDateDoUsuario) && examDateDoUsuario >= hojeYmd) {
    // Casa com um edital conhecido? Então dá pra nomear a edição e linkar.
    const casado = EDITAIS.find((e) => e.dataPrimeiraFase === examDateDoUsuario)
    return {
      ordinal: casado?.ordinal ?? "",
      slug: casado?.slug ?? "",
      data: examDateDoUsuario,
      diasRestantes: diasEntreYmd(hojeYmd, examDateDoUsuario),
      origem: "usuario",
    }
  }

  if (!oficial) return null

  return {
    ordinal: oficial.ordinal,
    slug: oficial.slug,
    data: oficial.dataPrimeiraFase,
    diasRestantes: diasEntreYmd(hojeYmd, oficial.dataPrimeiraFase),
    origem: "oficial",
  }
}

const DATA_COMPLETA = /^\d{4}-\d{2}-\d{2}$/

/**
 * Dias entre dois "YYYY-MM-DD" civis.
 *
 * Ancorado ao MEIO-DIA UTC de propósito: comparar meia-noite de dois dias civis
 * dá 23h ou 25h em qualquer fuso com transição, e o arredondamento erra um dia
 * inteiro. Com âncora ao meio-dia sobra folga de 12h dos dois lados.
 */
function diasEntreYmd(de: string, ate: string): number {
  const MS_DIA = 86_400_000
  return Math.round(
    (Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / MS_DIA,
  )
}
