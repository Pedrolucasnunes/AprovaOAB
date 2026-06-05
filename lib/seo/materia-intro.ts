// Conteúdo editorial por matéria para as páginas públicas de SEO.
// Chaveado pelo slug da matéria (subjectSlug). Quando uma matéria não tem entrada
// aqui, a página cai no texto genérico — então dá pra ir preenchendo aos poucos.
//
// Objetivo: dar a cada página /questoes/[materia] um texto único e útil ("o que cai",
// "como estuda"), que é o que faz a página ranquear nos termos-cabeça da matéria
// (ex.: "questões de direito penal OAB"). Texto humano, sem keyword stuffing.

export type MateriaIntro = {
  // Parágrafo de abertura — substitui o texto genérico sob o H1. 2-4 frases.
  lead: string
  // "O que mais cai" — tópicos curtos. Vira uma seção com <h2> abaixo das questões.
  topicos?: string[]
  // Dica de estudo — 1-2 frases.
  dica?: string
}

export const MATERIA_INTRO: Record<string, MateriaIntro> = {
  "etica-profissional": {
    lead:
      "Ética Profissional é a matéria mais cobrada na 1ª fase da OAB — costuma ser a área com o maior número de questões em toda a prova, em torno de 10. Cai sobre o Estatuto da Advocacia (Lei 8.906/94), o Código de Ética e Disciplina e o Regulamento Geral da OAB.",
    topicos: [
      "Direitos, deveres e prerrogativas do advogado",
      "Honorários advocatícios: contratuais, de sucumbência e arbitrados",
      "Infrações e sanções disciplinares (censura, suspensão, exclusão e multa)",
      "Processo disciplinar, competência dos órgãos da OAB e prescrição",
      "Incompatibilidades e impedimentos para o exercício da advocacia",
      "Sociedade de advogados e advogado empregado",
    ],
    dica:
      "Por ser a matéria com mais questões, Ética é onde mais se ganha pontos com menos conteúdo. A FGV cobra muito a letra do Estatuto e do Código de Ética — treinar questões fixa rápido os prazos e as sanções que mais se repetem.",
  },

  "direito-constitucional": {
    lead:
      "Direito Constitucional é uma das matérias de maior peso na 1ª fase da OAB: a FGV costuma cobrar entre 6 e 8 questões por prova. A maior parte gira em torno dos direitos e garantias fundamentais, da organização dos poderes e do controle de constitucionalidade — temas que se repetem exame após exame.",
    topicos: [
      "Direitos e garantias fundamentais (art. 5º) e os remédios constitucionais: habeas corpus, mandado de segurança, mandado de injunção e habeas data",
      "Controle de constitucionalidade difuso e concentrado, e as ações do STF (ADI, ADC, ADPF)",
      "Organização do Estado e a repartição de competências entre União, estados e municípios",
      "Organização dos poderes (Legislativo, Executivo e Judiciário) e o processo legislativo",
      "Direitos sociais, nacionalidade e direitos políticos",
    ],
    dica:
      "A FGV gosta de cobrar a literalidade da Constituição. Resolver muitas questões é o jeito mais rápido de fixar os artigos que mais se repetem e perceber as pegadinhas recorrentes da banca.",
  },

  "direito-civil": {
    lead:
      "Direito Civil é uma das matérias mais extensas e mais cobradas na 1ª fase da OAB, toda baseada no Código Civil de 2002. A FGV distribui as questões entre parte geral, obrigações, contratos, responsabilidade civil, direitos reais e família e sucessões.",
    topicos: [
      "Lei de Introdução às Normas do Direito Brasileiro (LINDB)",
      "Parte geral: pessoas, bens, negócios jurídicos, prescrição e decadência",
      "Obrigações e responsabilidade civil",
      "Contratos em geral e em espécie",
      "Direitos reais: posse e propriedade",
      "Direito de família e sucessões",
    ],
    dica:
      "Por ser uma matéria enorme, priorize os temas que mais se repetem: responsabilidade civil, contratos e prescrição/decadência. Resolver questões ajuda a identificar onde a banca concentra a cobrança.",
  },

  "processo-civil": {
    lead:
      "Processo Civil é cobrança pesada na 1ª fase da OAB, baseada no CPC de 2015. A FGV gosta especialmente de tutela provisória, recursos e da estrutura do procedimento comum.",
    topicos: [
      "Jurisdição, competência e partes no processo",
      "Petição inicial, resposta do réu e providências preliminares",
      "Tutela provisória de urgência e de evidência",
      "Sentença, coisa julgada e cumprimento de sentença",
      "Recursos: apelação, agravo de instrumento e recursos aos tribunais superiores",
      "Procedimentos especiais",
    ],
    dica:
      "Tutela provisória e recursos são os campeões de incidência. Ter os prazos do CPC na ponta da língua resolve muitas questões — e treinar é o que fixa esses prazos.",
  },

  "direito-penal": {
    lead:
      "Direito Penal tem presença constante na 1ª fase da OAB. A FGV concentra a cobrança na teoria do crime e na aplicação da pena, além de alguns crimes em espécie da Parte Especial do Código Penal.",
    topicos: [
      "Teoria do crime: fato típico, ilicitude e culpabilidade",
      "Iter criminis — tentativa, desistência voluntária e arrependimento eficaz",
      "Concurso de pessoas e concurso de crimes",
      "Aplicação e dosimetria da pena",
      "Extinção da punibilidade e prescrição",
      "Crimes contra a pessoa e contra o patrimônio",
    ],
    dica:
      "Domine primeiro a teoria do crime — ela é a base de quase toda questão da matéria. Resolver questões ajuda a perceber como a FGV monta as pegadinhas entre tentativa, desistência e arrependimento.",
  },

  "processo-penal": {
    lead:
      "Processo Penal é cobrança recorrente na 1ª fase da OAB, normalmente em conjunto com o Direito Penal. A banca gosta de prisões e medidas cautelares, sistema de provas e competência.",
    topicos: [
      "Inquérito policial e investigação criminal",
      "Ação penal pública e privada",
      "Prisões e medidas cautelares (prisão preventiva, temporária e em flagrante)",
      "Provas no processo penal e nulidades",
      "Competência e jurisdição",
      "Recursos e o habeas corpus",
    ],
    dica:
      "Atenção especial às prisões cautelares e aos prazos — é o que mais cai. Estudar junto com Direito Penal rende, porque muitas questões cobram os dois temas ao mesmo tempo.",
  },

  "direito-do-trabalho": {
    lead:
      "Direito do Trabalho é uma das áreas mais cobradas na 1ª fase da OAB. A FGV exige bastante da CLT, especialmente contrato de trabalho, jornada e verbas rescisórias, já considerando a Reforma Trabalhista.",
    topicos: [
      "Relação de emprego e seus requisitos (pessoalidade, onerosidade, habitualidade, subordinação)",
      "Contrato de trabalho e suas modalidades",
      "Jornada de trabalho, horas extras e intervalos",
      "Férias, 13º salário e demais verbas",
      "Rescisão do contrato e verbas rescisórias",
      "FGTS, estabilidade e garantias de emprego",
    ],
    dica:
      "Foque nos direitos do empregado e nos cálculos de verbas rescisórias — é o coração da matéria. Fique atento ao que mudou com a Reforma Trabalhista (Lei 13.467/2017), tema preferido da banca.",
  },

  "direito-administrativo": {
    lead:
      "Direito Administrativo é cobrança forte na 1ª fase da OAB. A FGV concentra as questões em princípios, atos administrativos, licitações e contratos e responsabilidade do Estado.",
    topicos: [
      "Princípios da Administração Pública",
      "Atos administrativos: requisitos, atributos e extinção",
      "Poderes da Administração e poder de polícia",
      "Licitações e contratos administrativos (Lei 14.133/2021)",
      "Serviços públicos e agentes públicos",
      "Responsabilidade civil do Estado e improbidade administrativa",
    ],
    dica:
      "Atos administrativos e princípios são a base de quase tudo. Fique atento à nova Lei de Licitações (14.133/2021), que a banca passou a cobrar com frequência.",
  },

  "processo-do-trabalho": {
    lead:
      "Processo do Trabalho costuma vir logo após o Direito do Trabalho na 1ª fase da OAB. A FGV cobra a competência da Justiça do Trabalho, o rito do processo e os recursos trabalhistas.",
    topicos: [
      "Competência da Justiça do Trabalho",
      "Procedimentos: rito ordinário e sumaríssimo",
      "Audiência trabalhista e jus postulandi",
      "Recursos trabalhistas (recurso ordinário, recurso de revista, agravos)",
      "Execução trabalhista",
      "Prazos e prescrição no processo do trabalho",
    ],
    dica:
      "Os recursos trabalhistas e os prazos são o que mais cai. Estudar em sequência com Direito do Trabalho ajuda, porque a prova costuma encadear os dois.",
  },

  "direito-tributario": {
    lead:
      "Direito Tributário é cobrança certa na 1ª fase da OAB, baseada na Constituição e no Código Tributário Nacional (CTN). A FGV gosta de princípios, limitações ao poder de tributar e crédito tributário.",
    topicos: [
      "Sistema tributário nacional e princípios (legalidade, anterioridade, isonomia)",
      "Competência tributária e limitações ao poder de tributar",
      "Espécies de tributos: impostos, taxas e contribuições",
      "Obrigação tributária, fato gerador e responsabilidade tributária",
      "Crédito tributário: lançamento, suspensão, extinção e exclusão",
      "Imunidades tributárias",
    ],
    dica:
      "Princípios e imunidades são os temas mais cobrados. Ter o CTN bem fixado — sobretudo as regras do crédito tributário — faz diferença, e treinar questões é o caminho mais rápido.",
  },

  "direito-empresarial": {
    lead:
      "Direito Empresarial aparece com regularidade na 1ª fase da OAB. A FGV cobra principalmente sociedades, títulos de crédito e recuperação judicial e falência.",
    topicos: [
      "Teoria geral do direito empresarial e o conceito de empresário",
      "Tipos societários: sociedade limitada e sociedade anônima",
      "Títulos de crédito",
      "Recuperação judicial, extrajudicial e falência (Lei 11.101/2005)",
      "Propriedade industrial",
      "Contratos empresariais",
    ],
    dica:
      "Títulos de crédito e recuperação/falência são os temas recorrentes. Comece por eles e pelas regras das sociedades limitada e anônima, que a banca adora cobrar.",
  },

  "direito-internacional": {
    lead:
      "Direito Internacional aparece com regularidade na 1ª fase da OAB, geralmente com poucas questões, mas muito previsíveis. A FGV cobra a incorporação de tratados, nacionalidade e cooperação jurídica internacional.",
    topicos: [
      "Fontes do Direito Internacional e a incorporação de tratados no ordenamento brasileiro",
      "Nacionalidade e condição jurídica do estrangeiro",
      "Cooperação jurídica internacional: homologação de sentença estrangeira e carta rogatória",
      "Direito Internacional Privado e a LINDB",
      "Organizações internacionais e o Mercosul",
    ],
    dica:
      "Como costumam cair poucas questões e bem repetidas, é uma matéria de ótimo custo-benefício: pouco conteúdo recorrente. Treinar questões antigas é o caminho mais eficiente.",
  },

  "direito-do-consumidor": {
    lead:
      "Direito do Consumidor é cobrança frequente na 1ª fase da OAB, toda baseada no Código de Defesa do Consumidor (Lei 8.078/90). A FGV gosta de responsabilidade por vício e por fato do produto e de práticas abusivas.",
    topicos: [
      "Relação de consumo: conceitos de consumidor, fornecedor, produto e serviço",
      "Responsabilidade pelo fato e pelo vício do produto e do serviço",
      "Direitos básicos do consumidor",
      "Práticas abusivas, publicidade enganosa e oferta",
      "Proteção contratual e cláusulas abusivas",
      "Prazos: decadência e prescrição no CDC",
    ],
    dica:
      "Saber diferenciar vício de fato do produto/serviço resolve boa parte das questões. A FGV cobra bastante a literalidade do CDC, então resolver questões fixa rápido os artigos-chave.",
  },

  "filosofia-do-direito": {
    lead:
      "Filosofia do Direito costuma ter poucas questões na 1ª fase da OAB, mas com temas conceituais bem definidos. A FGV cobra as principais correntes jusfilosóficas e as teorias da justiça.",
    topicos: [
      "Jusnaturalismo e juspositivismo",
      "A relação entre direito e moral",
      "Teorias da justiça",
      "Principais pensadores e suas ideias",
      "Hermenêutica e argumentação jurídica",
    ],
    dica:
      "Por ser conteúdo conceitual e com poucas questões, vale conhecer bem as grandes correntes e seus autores. Resolver questões anteriores mostra rápido o recorte que a banca prefere.",
  },

  "direito-ambiental": {
    lead:
      "Direito Ambiental aparece com regularidade na 1ª fase da OAB, normalmente com poucas questões. A FGV cobra os princípios ambientais, o licenciamento e a responsabilidade ambiental.",
    topicos: [
      "Princípios do Direito Ambiental (prevenção, precaução, poluidor-pagador)",
      "Política Nacional do Meio Ambiente e o SISNAMA",
      "Licenciamento ambiental e estudo de impacto ambiental",
      "Responsabilidade ambiental: civil, penal e administrativa",
      "Áreas de preservação permanente e unidades de conservação",
      "Código Florestal",
    ],
    dica:
      "Os princípios e a responsabilidade ambiental (que é objetiva na esfera civil) são os temas mais cobrados. Comece por eles para garantir as questões mais prováveis.",
  },

  "estatuto-da-crianca-e-do-adolescente": {
    lead:
      "O Estatuto da Criança e do Adolescente (ECA, Lei 8.069/90) aparece na 1ª fase da OAB com temas bem definidos. A FGV cobra medidas de proteção, ato infracional e os princípios da doutrina da proteção integral.",
    topicos: [
      "Direitos fundamentais da criança e do adolescente e a proteção integral",
      "Medidas de proteção",
      "Ato infracional e medidas socioeducativas",
      "Conselho Tutelar e seu papel",
      "Adoção, guarda, tutela e família substituta",
      "Crimes e infrações administrativas previstos no ECA",
    ],
    dica:
      "Concentre-se na diferença entre medidas de proteção e medidas socioeducativas — é a pegadinha clássica da banca. Como o conteúdo cobrado é enxuto, vale dominá-lo bem.",
  },

  "direitos-humanos": {
    lead:
      "Direitos Humanos aparece na 1ª fase da OAB com poucas questões, mas previsíveis. A FGV cobra os sistemas de proteção (global e interamericano) e a incorporação de tratados no Brasil.",
    topicos: [
      "Características dos direitos humanos",
      "Sistema global de proteção (ONU e a Declaração Universal)",
      "Sistema interamericano (Convenção Americana e Corte Interamericana)",
      "Incorporação de tratados de direitos humanos no ordenamento brasileiro",
      "Tratados com status supralegal e constitucional (§ 3º do art. 5º)",
    ],
    dica:
      "O sistema interamericano e a hierarquia dos tratados de direitos humanos são os temas preferidos da banca. Foque neles para render mais com pouco conteúdo.",
  },

  "direito-eleitoral": {
    lead:
      "Direito Eleitoral aparece na 1ª fase da OAB com poucas questões, mas em temas recorrentes. A FGV cobra direitos políticos, inelegibilidades e a organização da Justiça Eleitoral.",
    topicos: [
      "Organização da Justiça Eleitoral",
      "Direitos políticos, alistamento e elegibilidade",
      "Inelegibilidades e a Lei da Ficha Limpa",
      "Partidos políticos",
      "Propaganda eleitoral",
      "Crimes eleitorais",
    ],
    dica:
      "Inelegibilidades e direitos políticos são os campeões de incidência. Comece por eles, que concentram a maior parte das questões da matéria.",
  },

  "direito-previdenciario": {
    lead:
      "Direito Previdenciário costuma ter poucas questões na 1ª fase da OAB, mas em temas recorrentes. A FGV cobra benefícios do Regime Geral, segurados e dependentes, já considerando a Reforma da Previdência (EC 103/2019).",
    topicos: [
      "Seguridade social e seus princípios",
      "Regimes previdenciários (RGPS e RPPS)",
      "Segurados obrigatórios, facultativos e dependentes",
      "Benefícios: aposentadorias, auxílios, pensão por morte e salário-maternidade",
      "Carência e qualidade de segurado",
      "Custeio e contribuições da seguridade social",
    ],
    dica:
      "Foque nos benefícios e nas regras de carência — é o que mais cai. Fique atento às mudanças trazidas pela Reforma da Previdência (EC 103/2019), que a banca cobra com frequência.",
  },

  "direito-financeiro": {
    lead:
      "Direito Financeiro aparece na 1ª fase da OAB com poucas questões, concentradas em orçamento público e responsabilidade fiscal. É uma matéria enxuta e de bom custo-benefício.",
    topicos: [
      "Orçamento público: PPA, LDO e LOA",
      "Princípios orçamentários",
      "Receitas e despesas públicas",
      "Lei de Responsabilidade Fiscal (LC 101/2000)",
      "Fiscalização e controle (Tribunais de Contas)",
    ],
    dica:
      "Orçamento público e a Lei de Responsabilidade Fiscal são praticamente todo o conteúdo cobrado. Por ser enxuta, dá pra garantir essas questões com pouco estudo direcionado.",
  },
}

export function getMateriaIntro(slug: string): MateriaIntro | null {
  return MATERIA_INTRO[slug] ?? null
}
