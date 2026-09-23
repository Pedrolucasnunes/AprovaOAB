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
  /**
   * "R$ 350,00", ou `null` enquanto a FGV não anunciou o valor.
   *
   * Nulável porque o calendário da OAB sai MESES antes do edital de abertura, e
   * é ele que traz as datas: quando o 48º entrou aqui (set/2026), a taxa ainda
   * não existia em lugar nenhum. Repetir os R$ 350 do exame anterior seria
   * inventar valor — exatamente o que a regra no topo deste arquivo proíbe —, e
   * o leitor não teria como saber que aquele número era chute. A página troca a
   * frase inteira quando vem `null`; não exibe "R$ 0,00" nem esconde a seção.
   */
  taxaInscricao: string | null
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
    { label: "1ª fase (prova objetiva)", data: "06/09/2026", destaque: true },
    { label: "Gabarito preliminar da 1ª fase", data: "06/09/2026" },
    { label: "Gabarito definitivo e resultado preliminar da 1ª fase", data: "23/09/2026" },
    { label: "Resultado final da 1ª fase", data: "05/10/2026" },
    { label: "Divulgação dos locais de prova (2ª fase)", data: "09/10/2026" },
    { label: "2ª fase (prova prático-profissional)", data: "18/10/2026", destaque: true },
    { label: "Resultado preliminar da 2ª fase", data: "12/11/2026" },
    { label: "Resultado final do Exame", data: "03/12/2026" },
  ],
  checklist: [
    "Acesse o site oficial da FGV (oab.fgv.br) durante o período de inscrição.",
    "Crie ou atualize seu cadastro com os dados pessoais e o documento de identidade.",
    "Preencha a ficha de inscrição e escolha a cidade onde deseja fazer a prova.",
    "Se for o caso, solicite a isenção da taxa dentro do prazo (mesma janela da inscrição).",
    "Gere e pague o boleto da taxa até o prazo limite. Sem o pagamento, a inscrição não é confirmada.",
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

// O 48º entrou ANTES do edital de abertura (em 07/09/2026, com `publicado:
// false` e as datas do comunicado oab.org.br/noticia/64207), porque
// `proximaPrimeiraFase()` devolve `null` quando não há 1ª fase futura em
// EDITAIS: no dia seguinte à prova do 47º a contagem regressiva sumiu do
// dashboard sem que nada quebrasse. O conserto é ter sempre o próximo exame aqui.
//
// Edital de abertura publicado em 21/09/2026 e conferido no PDF oficial
// (s.oab.org.br/arquivos/2026/09/fb43fb37-838e-4d33-a863-99fa1f98b921.pdf):
// taxa e inscrição no item 2.1.2, isenção no 2.6, reaproveitamento no 2.8.1.1 e
// as datas no cronograma do Anexo. Uma data MUDOU em relação ao comunicado: o
// edital complementar do reaproveitamento passou de 13/11 pra 12/11.
//
// "Inscrições para o reaproveitamento (23 a 30/11)" NÃO está no edital de
// abertura: vem do comunicado 64207 e só é fixada pelo edital complementar.
// Conferir quando ele sair, em 12/11.
const EDICAO_48: Edital = {
  slug: "48-exame-oab",
  numero: 48,
  ordinal: "48º",
  // Ano das PROVAS, não o do edital: as duas fases caem em 2027. É esse número
  // que vira o selo do card no hub, ao lado de "48º Exame de Ordem".
  ano: 2027,
  publicado: true,
  taxaInscricao: "R$ 350,00",
  // Página do 48º no portal da FGV (banca), onde saem edital, retificações,
  // locais e resultados. Mesmo critério do 47º: a página do exame, não o PDF.
  fonteOficialUrl: "https://oab.fgv.br/home.aspx?key=651",
  atualizadoEm: "2026-09-22",
  dataPrimeiraFase: "2027-01-10",
  dataSegundaFase: "2027-02-28",
  resumo:
    "O edital do 48º Exame de Ordem Unificado foi publicado em 21 de setembro de 2026, com " +
    "inscrições das 17h de 28 de setembro às 17h de 5 de outubro (horário de Brasília) e taxa de " +
    "R$ 350,00. A 1ª fase (prova objetiva) acontece em 10 de janeiro de 2027 e a 2ª fase (prova " +
    "prático-profissional) em 28 de fevereiro de 2027. Abaixo você encontra o cronograma completo " +
    "com todas as datas oficiais, a taxa de inscrição e as principais dúvidas.",
  cronograma: [
    // Sem `obs`: o campo existe no tipo mas NÃO é renderizado por
    // app/editais/[slug]/page.tsx, então qualquer texto ali some da tela sem
    // erro nenhum. O que o leitor precisa saber vai no `label`.
    { label: "Publicação do edital de abertura", data: "21/09/2026" },
    { label: "Período de inscrições (abre e fecha às 17h)", data: "28/09 a 05/10/2026" },
    { label: "Solicitação de isenção da taxa", data: "28/09 a 05/10/2026" },
    { label: "Resultado preliminar da isenção", data: "04/11/2026" },
    {
      label: "Edital complementar do reaproveitamento da 1ª fase do 47º",
      data: "12/11/2026",
    },
    { label: "Inscrições para o reaproveitamento", data: "23 a 30/11/2026" },
    { label: "Resultado definitivo da isenção", data: "02/12/2026" },
    { label: "Prazo limite para pagamento da taxa", data: "04/12/2026" },
    { label: "Divulgação dos locais de prova (1ª fase)", data: "04/01/2027" },
    { label: "1ª fase (prova objetiva)", data: "10/01/2027", destaque: true },
    { label: "Gabarito preliminar da 1ª fase", data: "10/01/2027" },
    { label: "Prazo de recurso contra o gabarito preliminar", data: "12 a 14/01/2027" },
    { label: "Gabarito definitivo e resultado preliminar da 1ª fase", data: "27/01/2027" },
    { label: "Resultado final da 1ª fase", data: "10/02/2027" },
    { label: "Divulgação dos locais de prova (2ª fase)", data: "22/02/2027" },
    { label: "2ª fase (prova prático-profissional)", data: "28/02/2027", destaque: true },
    { label: "Resultado preliminar da 2ª fase", data: "24/03/2027" },
    { label: "Resultado final do Exame", data: "07/04/2027" },
  ],
  checklist: [
    "Acesse o site oficial da FGV (oab.fgv.br) entre as 17h de 28 de setembro e as 17h de 5 de outubro de 2026, horário de Brasília. A inscrição abre e fecha às 17h, não à meia-noite.",
    "Crie ou atualize seu cadastro com os dados pessoais e o documento de identidade.",
    "Preencha a ficha de inscrição e escolha a cidade onde deseja fazer a prova.",
    "Se estiver inscrito no CadÚnico, solicite a isenção da taxa na mesma janela da inscrição, informando o NIS e enviando a documentação.",
    "Gere e pague o boleto de R$ 350,00 até 4 de dezembro de 2026. Sem o pagamento, a inscrição não é confirmada.",
  ],
  faq: [
    {
      pergunta: "Quando é a prova da 1ª fase do 48º Exame da OAB?",
      resposta:
        "A 1ª fase (prova objetiva) do 48º Exame de Ordem será aplicada em 10 de janeiro de 2027, " +
        "das 13h às 18h (horário de Brasília), conforme o edital de abertura. A 2ª fase acontece em " +
        "28 de fevereiro de 2027.",
    },
    {
      pergunta: "Quando abrem as inscrições do 48º Exame de Ordem?",
      resposta:
        "As inscrições vão das 17h de 28 de setembro às 17h de 5 de outubro de 2026, horário de " +
        "Brasília, exclusivamente pelo site da FGV (oab.fgv.br).",
    },
    {
      pergunta: "Quanto custa a inscrição no 48º Exame de Ordem?",
      resposta:
        "A taxa de inscrição é de R$ 350,00, com prazo limite de pagamento até 4 de dezembro de " +
        "2026. Quem está inscrito no CadÚnico pode pedir isenção entre 28 de setembro e 5 de outubro.",
    },
    {
      pergunta: "Fui aprovado na 1ª fase do 47º Exame. Preciso fazer a 1ª fase de novo?",
      resposta:
        "Não. Quem foi aprovado na 1ª fase do 47º Exame e não concluiu a 2ª pode aproveitar essa " +
        "aprovação no 48º Exame. O edital complementar do reaproveitamento está previsto para 12 de " +
        "novembro de 2026, e é ele que fixa o período de inscrição.",
    },
    {
      pergunta: "Qual é a nota de corte da 1ª fase da OAB?",
      resposta:
        "A 1ª fase tem 80 questões de múltipla escolha. É preciso acertar pelo menos 40 (50%) para " +
        "ser aprovado e avançar à 2ª fase.",
    },
  ],
}

export const EDITAIS: Edital[] = [EDICAO_47, EDICAO_48]

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

/**
 * Como a prova é nomeada nas duas posições sintáticas em que ela aparece.
 *
 * São dois campos e não um porque o português não deixa derivar um do outro:
 * "pra 1ª fase" perde o artigo que "A 1ª fase é hoje" exige, e concatenar
 * "pra" + "a 1ª fase" dá "pra a" (o "pra" já contém o artigo). Derivar isso
 * com regra daria certo em português e errado em qualquer palavra nova.
 *
 * Mora AQUI, e não no card do dashboard onde nasceu, porque aquele arquivo é
 * `"use client"`: tudo que ele exporta vira referência de cliente, e o painel
 * das telas de auth precisa montar a frase no servidor.
 */
export interface NomeDaProva {
  /** Depois de "pra": "pra 1ª fase do 48º Exame" / "pra sua prova". */
  comPreposicao: string
  /** Como sujeito: "A 1ª fase do 48º Exame é hoje" / "Sua prova é hoje". */
  comoSujeito: string
}

/**
 * O rótulo declara de onde veio a data. Sem edição casada só dá pra dizer
 * "sua prova" — afirmar que é o 48º Exame seria inventar em cima do que a
 * pessoa digitou.
 */
export function nomeDaProva(prova: ProximaProva): NomeDaProva {
  if (prova.origem === "usuario" && !prova.ordinal) {
    return { comPreposicao: "sua prova", comoSujeito: "Sua prova" }
  }
  return {
    comPreposicao: `1ª fase do ${prova.ordinal} Exame`,
    comoSujeito: `A 1ª fase do ${prova.ordinal} Exame`,
  }
}

/** A frase inteira, não só o número — a regência muda com a contagem. */
export function fraseDaContagem(dias: number, nome: NomeDaProva): string {
  if (dias <= 0) return `${nome.comoSujeito} é hoje`
  if (dias === 1) return `Falta 1 dia pra ${nome.comPreposicao}`
  return `Faltam ${dias} dias pra ${nome.comPreposicao}`
}

/**
 * "2027-01-10" → "10/01/2027". Corte de string, sem passar por `Date`.
 *
 * Sem fuso de propósito: são datas CIVIS do calendário da OAB, não instantes.
 * `new Date("2027-01-10")` é meia-noite UTC, que em Brasília é 21h do dia 9 —
 * a tela anunciaria a prova um dia antes. É também o formato que
 * `/editais/[slug]` já exibe, então quem segue o link do cronograma
 * reencontra a data escrita igual.
 */
export function formatarDataCivil(iso: string): string {
  const [ano, mes, dia] = iso.split("-")
  return `${dia}/${mes}/${ano}`
}
