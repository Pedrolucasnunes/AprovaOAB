import { META_APROVACAO } from "@/lib/metrics"

/**
 * Leitura do resultado de um simulado — lógica pura, zero I/O.
 *
 * Existe separada porque as mesmas perguntas ("essa questão foi o quê?", "onde
 * eu perdi ponto?") são feitas por quatro superfícies da tela de resultado: o
 * hero, o mapa, a lista de disciplinas e os filtros do gabarito. Cada uma
 * respondendo por conta própria é como elas passam a discordar.
 */

/**
 * Branco NÃO é erro. Pra nota são a mesma coisa (a OAB não dá ponto por
 * nenhum dos dois, e é por isso que `finalizar` soma os dois em `erros`), mas
 * pro estudo são problemas opostos: errar é conteúdo, não chegar é ritmo.
 * Medido na base em set/2026: 10 dos 14 simulados finalizados têm pelo menos
 * uma questão em branco, 574 no total — o caso comum, não a exceção.
 */
export type EstadoItem = "acerto" | "erro" | "branco"

export interface ItemGabarito {
  questionId: string
  ordem: number
  enunciado: string
  alternativaA: string
  alternativaB: string
  alternativaC: string
  alternativaD: string
  /** `null` = a pessoa não respondeu. */
  respostaUsuario: string | null
  respostaCorreta: string
  /** `null` quando em branco. Ver `estadoDoItem` pra por que não é derivado. */
  acertou: boolean | null
  explicacao: string | null
  subjectId: string | null
  subjectName: string
}

/**
 * Usa o `acertou` GRAVADO, nunca uma comparação de letras feita agora.
 *
 * Gabarito corrigido depois muda `questions.resposta_correta`, e a decisão de
 * errata registrada é corrigir a questão sem remediar o histórico. Recalcular
 * aqui faria o resultado antigo mudar sozinho na tela sem que o `percentual`
 * gravado mudasse junto — os dois números na mesma página se contradizendo.
 */
export function estadoDoItem(item: Pick<ItemGabarito, "respostaUsuario" | "acertou">): EstadoItem {
  if (!item.respostaUsuario) return "branco"
  return item.acertou ? "acerto" : "erro"
}

export interface ContagemResultado {
  acertos: number
  /** Só as respondidas e erradas. */
  erros: number
  brancos: number
  /** Erros + brancos: o que a OAB desconta, e o que a nota reflete. */
  perdidos: number
  respondidas: number
  total: number
}

export function contarEstados(itens: ItemGabarito[]): ContagemResultado {
  let acertos = 0
  let erros = 0
  let brancos = 0

  for (const item of itens) {
    const estado = estadoDoItem(item)
    if (estado === "acerto") acertos++
    else if (estado === "erro") erros++
    else brancos++
  }

  return {
    acertos,
    erros,
    brancos,
    perdidos: erros + brancos,
    respondidas: acertos + erros,
    total: itens.length,
  }
}

/** Acertos necessários pra nota de corte. Derivado do total REAL da prova. */
export function acertosParaNotaDeCorte(numeroQuestoes: number): number {
  return Math.ceil((numeroQuestoes * META_APROVACAO) / 100)
}

export interface MateriaResultado {
  subjectId: string | null
  nome: string
  acertos: number
  erros: number
  brancos: number
  /** Acertos + erros. Zero = a pessoa não respondeu NADA desta matéria. */
  respondidas: number
  total: number
  /** Erros + brancos: o que esta matéria custou na nota. */
  perdidos: number
  /** Acertos sobre RESPONDIDAS. Sem sentido quando `respondidas` é 0. */
  taxa: number
}

/**
 * Ordena por ERRO, e a taxa é sobre as RESPONDIDAS — as duas coisas pelo mesmo
 * motivo.
 *
 * Ordenar por ponto perdido (erro + branco) parecia certo e não é: quem parou
 * na metade da prova tem as últimas matérias inteiras em branco, e elas subiam
 * ao topo com "0 de 7 acertos" e 0%, marcadas como prioridade de estudo. Não
 * houve medição nenhuma ali — é o mesmo erro de ler matéria sem amostra como
 * matéria com 0%. Branco é problema de relógio, e quem conta essa história é o
 * mapa; esta lista responde "o que eu errei sabendo que ia responder".
 *
 * Empate desempata pela taxa (pior primeiro) e depois pelo nome, pra a ordem
 * não dançar entre dois carregamentos.
 */
export function desempenhoPorMateria(itens: ItemGabarito[]): MateriaResultado[] {
  const porMateria = new Map<string, MateriaResultado>()

  for (const item of itens) {
    const chave = item.subjectId ?? item.subjectName
    let materia = porMateria.get(chave)
    if (!materia) {
      materia = {
        subjectId: item.subjectId,
        nome: item.subjectName,
        acertos: 0,
        erros: 0,
        brancos: 0,
        respondidas: 0,
        total: 0,
        perdidos: 0,
        taxa: 0,
      }
      porMateria.set(chave, materia)
    }

    const estado = estadoDoItem(item)
    if (estado === "acerto") materia.acertos++
    else if (estado === "erro") materia.erros++
    else materia.brancos++
    materia.total++
  }

  const lista = [...porMateria.values()]
  for (const materia of lista) {
    materia.respondidas = materia.acertos + materia.erros
    materia.perdidos = materia.erros + materia.brancos
    materia.taxa =
      materia.respondidas > 0
        ? Math.round((materia.acertos / materia.respondidas) * 100)
        : 0
  }

  return lista.sort(
    (a, b) => b.erros - a.erros || a.taxa - b.taxa || a.nome.localeCompare(b.nome, "pt-BR"),
  )
}

/**
 * Quantas matérias do topo levam PRIORIDADE.
 *
 * Três é o que cabe numa frase ("22 dos seus 64 erros estão em três áreas") e
 * o que uma semana de estudo cobre. Acima disso o destaque para de destacar.
 */
export const MATERIAS_PRIORITARIAS = 3

/** Abaixo desta fatia, o topo não concentra nada e a frase não é dita. */
const FATIA_MINIMA_CONCENTRACAO = 0.4

export interface Concentracao {
  erros: number
  areas: number
  totalErros: number
}

/**
 * "22 dos seus 34 erros estão em só três áreas" — devolve `null` quando isso
 * não é verdade. Com os erros espalhados por igual, ou com poucas matérias na
 * prova, a frase vira ruído que sugere um foco que os dados não sustentam.
 *
 * Conta ERRO, não ponto perdido, pelo mesmo motivo de `desempenhoPorMateria`:
 * prometer "caminho curto pra ganhar pontos" apontando pra matérias que a
 * pessoa deixou em branco é apontar pra lugar nenhum.
 */
export function concentracaoDeErros(
  materias: MateriaResultado[],
  quantas: number = MATERIAS_PRIORITARIAS,
): Concentracao | null {
  const comErro = materias.filter((m) => m.erros > 0)
  if (comErro.length <= quantas) return null

  const totalErros = comErro.reduce((soma, m) => soma + m.erros, 0)
  if (totalErros === 0) return null

  const topo = comErro.slice(0, quantas).reduce((soma, m) => soma + m.erros, 0)
  if (topo / totalErros < FATIA_MINIMA_CONCENTRACAO) return null

  return { erros: topo, areas: quantas, totalErros }
}

export interface Comparacao {
  /** `"acertos"` compara questões; `"pontos"` compara pontos percentuais. */
  unidade: "acertos" | "pontos"
  /** Positivo melhorou, negativo piorou. Já arredondado pra exibição. */
  delta: number
}

/**
 * Compara com o simulado anterior EM ACERTOS sempre que dá.
 *
 * "+8 pontos" é ambíguo pra quem presta OAB: ponto é questão. Só cai em pontos
 * percentuais quando as duas provas têm números de questões diferentes, caso em
 * que comparar acertos crus seria comparar réguas distintas.
 */
export function compararComAnterior(
  atual: { acertos: number; percentual: number; numeroQuestoes: number },
  anterior: { acertos: number; percentual: number; numeroQuestoes: number },
): Comparacao {
  if (atual.numeroQuestoes === anterior.numeroQuestoes) {
    return { unidade: "acertos", delta: atual.acertos - anterior.acertos }
  }
  return { unidade: "pontos", delta: Math.round(atual.percentual - anterior.percentual) }
}

export interface TercoProva {
  taxa: number
  respondidas: number
  brancos: number
  total: number
}

export type LeituraCurva = "ritmo" | "queda" | "estavel"

export interface CurvaProva {
  tercos: [TercoProva, TercoProva, TercoProva]
  leitura: LeituraCurva
}

/**
 * Piso de respostas por terço pra a curva significar alguma coisa.
 *
 * Um terço com 2 respondidas e 1 certa daria "50%" e viraria uma queda ou uma
 * subida inventada. Mesmo princípio do `MIN_TENTATIVAS_BANDA`.
 */
const MIN_RESPONDIDAS_POR_TERCO = 5

/** Queda em pontos percentuais do 1º pro 3º terço que já é sinal, não ruído. */
const QUEDA_SIGNIFICATIVA = 15

/** Fatia do último terço em branco que denuncia tempo estourado. */
const FATIA_BRANCO_RITMO = 0.25

/**
 * Divide a prova em três e mede acerto SOBRE AS RESPONDIDAS, contando os
 * brancos à parte.
 *
 * Os dois números têm que andar juntos: contar branco como erro faz quem não
 * terminou parecer quem desaprendeu no meio da prova, e ignorar os brancos faz
 * quem respondeu 3 das 27 últimas aparecer com 67% de acerto no fim.
 *
 * Devolve `null` quando qualquer terço não tem amostra — a tela não mostra
 * nada, em vez de mostrar um diagnóstico frágil.
 */
export function curvaDaProva(itens: ItemGabarito[]): CurvaProva | null {
  if (itens.length < MIN_RESPONDIDAS_POR_TERCO * 3) return null

  const ordenados = [...itens].sort((a, b) => a.ordem - b.ordem)
  const corte = Math.floor(ordenados.length / 3)
  const fatias = [
    ordenados.slice(0, corte),
    ordenados.slice(corte, corte * 2),
    ordenados.slice(corte * 2),
  ]

  const tercos = fatias.map((fatia) => {
    const contagem = contarEstados(fatia)
    return {
      taxa:
        contagem.respondidas > 0
          ? Math.round((contagem.acertos / contagem.respondidas) * 100)
          : 0,
      respondidas: contagem.respondidas,
      brancos: contagem.brancos,
      total: fatia.length,
    }
  }) as [TercoProva, TercoProva, TercoProva]

  const [inicio, , fim] = tercos

  // Ritmo vem primeiro, e ANTES do piso de amostra de propósito: ele se apoia
  // só na contagem de brancos, que é exata em qualquer terço. Exigir 5
  // respondidas no último terço pra falar de ritmo silenciava justamente quem
  // parou na metade da prova — o caso em que o aviso mais serve.
  if (fim.brancos > inicio.brancos && fim.brancos / fim.total >= FATIA_BRANCO_RITMO) {
    return { tercos, leitura: "ritmo" }
  }

  // Daqui pra baixo a leitura depende de TAXA por terço, que precisa de amostra.
  if (tercos.some((t) => t.respondidas < MIN_RESPONDIDAS_POR_TERCO)) return null

  return {
    tercos,
    leitura: inicio.taxa - fim.taxa >= QUEDA_SIGNIFICATIVA ? "queda" : "estavel",
  }
}
