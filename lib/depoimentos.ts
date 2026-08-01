// Depoimentos exibidos na landing — lista curada à mão.
//
// Regra do projeto, a mesma de `lib/seo/stats.ts`: prova social ou é real e
// verificável, ou não aparece. Depoimento inventado seria exatamente o que o
// "R$ 29" riscado e o "Milhares de questões" eram antes de sair daqui — uma
// afirmação que o produto não sustenta.
//
// COMO ADICIONAR UM DEPOIMENTO
//
// 1. A pessoa autorizou o uso público da mensagem, com o nome exatamente como
//    está em `nome`. A landing afirma isso em voz alta no rodapé da seção
//    ("publicados com autorização de cada pessoa") — a afirmação tem que ser
//    verdadeira uma a uma.
// 2. `texto` são as palavras dela. Corrigir digitação e pontuação, sim;
//    reescrever pra soar melhor, não — reescrito deixa de ser depoimento e vira
//    copy assinada por terceiro.
// 3. `autorizadoEm` é a data da AUTORIZAÇÃO, não a da mensagem. Se você não tem
//    essa data, você não tem a autorização.
//
// POR QUE `contexto` E `fonte` SÃO OPCIONAIS
//
// Eram obrigatórios no desenho original. Viraram opcionais quando os primeiros
// dez depoimentos chegaram sem essa informação: campo obrigatório que ninguém
// consegue preencher com verdade é um convite a preencher com invenção — e
// "candidata ao XLIII Exame" ao lado de um nome real é uma afirmação sobre uma
// pessoa, não um detalhe de layout. Sem valor, o card mostra só o nome.
//
// `autorizadoEm` continua obrigatório de propósito: é o único campo que a
// landing transforma em promessa pública.
//
// Abaixo de `MIN_DEPOIMENTOS` a seção inteira não renderiza (ver
// `components/site/depoimentos.tsx`).

export type Depoimento = {
  /** Primeiro nome + inicial do sobrenome, como combinado com a pessoa: "Marina S." */
  nome: string
  /** As palavras da pessoa. */
  texto: string
  /** AAAA-MM-DD da autorização de uso público. Obrigatório de propósito. */
  autorizadoEm: string
  /** O que dá peso à fala: "candidata ao XLIII Exame". Só preencher se souber. */
  contexto?: string
  /** Onde a mensagem chegou — mantém a origem auditável meses depois. */
  fonte?: "whatsapp" | "feedback" | "email"
}

/**
 * Mínimo para a seção aparecer.
 *
 * Com 1 ou 2 depoimentos a seção fica visivelmente pela metade e comunica o
 * contrário do que existe pra comunicar.
 */
export const MIN_DEPOIMENTOS = 3

// Texto de cada pessoa como chegou. As únicas edições foram ponto final ausente
// e uma repetição ("do da" → "da", no Jose I.); nenhuma frase foi reescrita.
export const DEPOIMENTOS: Depoimento[] = [
  {
    nome: "Leticia C.",
    texto:
      "Fiz meu primeiro simulado hoje e gostei demais. Achei que ia me sair muito pior kkk. Ver exatamente quais matérias eu preciso melhorar deu uma clareza muito grande. Antes eu estudava meio perdida.",
    autorizadoEm: "2026-08-01",
  },
  {
    nome: "Pedro P.",
    texto:
      "O que eu mais gostei foi conseguir enxergar onde eu tô errando. A gente acha que tá indo mal em tudo, mas não é. Isso deu até mais vontade de continuar estudando.",
    autorizadoEm: "2026-08-01",
  },
  {
    nome: "Jose I.",
    texto:
      "Achei a plataforma bem intuitiva. Em poucos minutos já tava respondendo as questões, gostei muito da análise de desempenho no dashboard.",
    autorizadoEm: "2026-08-01",
  },
  {
    nome: "Caio D.",
    texto:
      "Pra quem tá começando agora ajuda muito, eu nem tinha conseguido organizar meus estudos ainda, o simulado já mostrou um caminho.",
    autorizadoEm: "2026-08-01",
  },
  {
    nome: "Ana C.",
    texto:
      "Gostei pq não fica só dizendo quantas você acertou e mostra realmente onde você precisa focar.",
    autorizadoEm: "2026-08-01",
  },
  {
    nome: "Ana P.",
    texto: "O relatório depois do simulado foi a parte que eu mais gostei.",
    autorizadoEm: "2026-08-01",
  },
  {
    nome: "Julia C.",
    texto:
      "Fiz o simulado sem expectativa nenhuma e acabei me surpreendendo. Vi que já tô melhor do que imaginava e já tenho um norte para começar a estudar.",
    autorizadoEm: "2026-08-01",
  },
  {
    nome: "Sydney O.",
    texto:
      "Eu gostei que a plataforma não fica só jogando questão, parece que ela realmente mostra como você tá evoluindo.",
    autorizadoEm: "2026-08-01",
  },
  {
    nome: "Paula C.",
    texto:
      "Está fazendo bastante diferença na minha preparação porque antes eu estudava no feeling e agora consigo ter um norte maior.",
    autorizadoEm: "2026-08-01",
  },
  {
    nome: "Hemilly F.",
    texto:
      "O melhor foi perceber que não preciso revisar tudo. Tem matéria que eu já tô indo bem e outras que preciso focar mais.",
    autorizadoEm: "2026-08-01",
  },
]
