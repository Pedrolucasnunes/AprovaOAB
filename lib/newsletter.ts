import { APP_URL } from "@/lib/app-url"

// ── Newsletter "Café com OAB" ────────────────────────────────────────────────
// Template HTML reutilizável + conteúdo das edições. O envio em massa é feito via
// Resend Broadcasts (ver app/api/admin/newsletter/*), que injeta automaticamente
// o link de descadastro em {{{RESEND_UNSUBSCRIBE_URL}}} e personaliza {{{FIRST_NAME}}}.

export type Alternativa = { letra: "A" | "B" | "C" | "D"; texto: string }

export type NewsletterEdicao = {
  numero: number
  /** Assunto do email. */
  subject: string
  /** Texto de preview (aparece na caixa de entrada antes de abrir). */
  preheader: string
  /** Parágrafos da introdução (depois do "Bom dia, Nome!"). */
  intro: string[]
  /** Linha de dado real da plataforma (ex.: matéria que mais reprova). Opcional. */
  termometro?: string
  questao: {
    /** Procedência + estatística, ex.: "FGV · Exame XXXIX/2023 · 25% de acerto". */
    fonte: string
    enunciado: string
    alternativas: Alternativa[]
    gabarito: "A" | "B" | "C" | "D"
    comentario: string
  }
  pegadinha: string
  /** Notícia atual e verificada (HTML permitido). `titulo` vira o cabeçalho da seção. */
  noticia?: { titulo: string; texto: string }
  /** Curiosidade jurídica (HTML permitido). `titulo` vira o cabeçalho da seção. */
  curiosidade?: { titulo: string; texto: string }
  dica: string
  /** Dias restantes até a prova. null = não exibe a contagem. */
  examDays?: number | null
}

// ── Paleta ───────────────────────────────────────────────────────────────────
const NAVY = "#0f172a"
const NAVY_SOFT = "#1e293b"
const GOLD = "#c8a04a"
const GREEN = "#10b981"
const INK = "#1f2937"
const MUTED = "#6b7280"
const LINE = "#e5e7eb"

/** URL pública do banner. Salve o PNG em `public/cafe-com-oab-banner.png`. */
export const BANNER_URL = `${APP_URL}/cafe-com-oab-banner.png`

/** Saudação conforme a hora de Brasília (America/Sao_Paulo). */
export function saudacaoBRT(date = new Date()): string {
  const hora = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(date),
  )
  if (hora < 12) return "Bom dia"
  if (hora < 18) return "Boa tarde"
  return "Boa noite"
}

function alternativaHtml(alt: Alternativa, gabarito: string): string {
  const acertou = alt.letra === gabarito
  const bg = acertou ? "#ecfdf5" : "#ffffff"
  const border = acertou ? GREEN : LINE
  const badgeBg = acertou ? GREEN : "#f3f4f6"
  const badgeColor = acertou ? "#ffffff" : INK
  return `
    <tr><td style="padding:0 0 8px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${border};border-radius:8px;background:${bg};">
        <tr>
          <td width="34" valign="top" style="padding:12px 0 12px 12px;">
            <div style="width:24px;height:24px;border-radius:6px;background:${badgeBg};color:${badgeColor};font-weight:700;font-size:13px;text-align:center;line-height:24px;">${alt.letra}</div>
          </td>
          <td style="padding:12px 14px 12px 8px;color:${INK};font-size:14px;line-height:1.5;">${alt.texto}</td>
        </tr>
      </table>
    </td></tr>`
}

function sectionTitle(label: string): string {
  return `
    <tr><td style="padding:28px 0 12px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="background:${NAVY};border-radius:6px;padding:10px 16px;color:#ffffff;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">${label}</td></tr>
      </table>
    </td></tr>`
}

export function buildNewsletterHtml(
  ed: NewsletterEdicao,
  opts?: { bannerUrl?: string; greeting?: string },
): string {
  const bannerUrl = opts?.bannerUrl || BANNER_URL
  const saudacao = opts?.greeting || saudacaoBRT()
  const intro = ed.intro
    .map((p) => `<p style="margin:0 0 14px 0;color:${INK};font-size:15px;line-height:1.6;">${p}</p>`)
    .join("")

  const alternativas = ed.questao.alternativas.map((a) => alternativaHtml(a, ed.questao.gabarito)).join("")

  const termometro = ed.termometro
    ? `${sectionTitle("📊 O termômetro da semana")}
       <tr><td>
         <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-left:4px solid #ef4444;background:#fef2f2;border-radius:0 8px 8px 0;">
           <tr><td style="padding:14px 16px;color:${INK};font-size:14px;line-height:1.6;">${ed.termometro}</td></tr>
         </table>
       </td></tr>`
    : ""

  const noticia = ed.noticia
    ? `${sectionTitle(ed.noticia.titulo)}
       <tr><td>
         <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-left:4px solid ${NAVY};background:#eff6ff;border-radius:0 8px 8px 0;">
           <tr><td style="padding:16px;color:${INK};font-size:14px;line-height:1.6;">${ed.noticia.texto}</td></tr>
         </table>
       </td></tr>`
    : ""

  const curiosidade = ed.curiosidade
    ? `${sectionTitle(ed.curiosidade.titulo)}
       <tr><td>
         <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid ${LINE};border-radius:8px;">
           <tr><td style="padding:16px;color:${INK};font-size:14px;line-height:1.6;">${ed.curiosidade.texto}</td></tr>
         </table>
       </td></tr>`
    : ""

  const contagem =
    ed.examDays != null
      ? `<p style="margin:0 0 6px 0;color:${GOLD};font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">⏳ Faltam ${ed.examDays} dias pra prova</p>`
      : ""

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <title>${ed.subject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${ed.preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

        <!-- Banner -->
        <tr><td style="background:${NAVY};">
          <img src="${bannerUrl}" alt="Café com OAB" width="600" style="display:block;width:100%;height:auto;border:0;">
        </td></tr>

        <!-- Corpo -->
        <tr><td style="padding:32px 28px 8px 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td>
              <p style="margin:0 0 16px 0;color:${NAVY};font-size:20px;font-weight:700;">${saudacao}, {{{FIRST_NAME|futuro(a) advogado(a)}}}! ☕</p>
              ${intro}
              <p style="margin:18px 0 0 0;color:${MUTED};font-size:14px;">É só rolar ⬇️</p>
            </td></tr>

            ${noticia}

            ${termometro}

            ${sectionTitle("🎯 A questão que derrubou geral")}
            <tr><td>
              <p style="margin:0 0 12px 0;color:${MUTED};font-size:12px;font-style:italic;">Questão real · ${ed.questao.fonte}</p>
              <p style="margin:0 0 16px 0;color:${INK};font-size:15px;line-height:1.6;">${ed.questao.enunciado}</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${alternativas}</table>
            </td></tr>

            <tr><td style="padding:16px 0 0 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ecfdf5;border-radius:8px;">
                <tr><td style="padding:16px;color:${INK};font-size:14px;line-height:1.6;">
                  <strong style="color:${GREEN};">👉 Gabarito: alternativa ${ed.questao.gabarito}.</strong><br>${ed.questao.comentario}
                </td></tr>
              </table>
            </td></tr>

            ${sectionTitle("⚠️ A pegadinha da FGV")}
            <tr><td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-left:4px solid ${GOLD};background:#fffbeb;border-radius:0 8px 8px 0;">
                <tr><td style="padding:16px;color:${INK};font-size:14px;line-height:1.6;">${ed.pegadinha}</td></tr>
              </table>
            </td></tr>

            ${curiosidade}

            ${sectionTitle("⏳ Sua dose da semana")}
            <tr><td style="padding-bottom:8px;">
              ${contagem}
              <p style="margin:0 0 20px 0;color:${INK};font-size:15px;line-height:1.6;"><strong>Dica:</strong> ${ed.dica}</p>
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr><td style="background:${GREEN};border-radius:8px;">
                  <a href="${APP_URL}" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;">🔥 Treinar com questões reais da FGV</a>
                </td></tr>
              </table>
              <p style="margin:14px 0 0 0;color:${MUTED};font-size:13px;">10 questões grátis por dia · ${APP_URL.replace(/^https?:\/\//, "")}</p>
            </td></tr>

          </table>
        </td></tr>

        <!-- Rodapé -->
        <tr><td style="padding:24px 28px;background:${NAVY_SOFT};">
          <p style="margin:0 0 8px 0;color:#cbd5e1;font-size:13px;">Bons estudos. Semana que vem tem mais. ☕<br><strong style="color:#ffffff;">Time AprovaOAB</strong></p>
          <p style="margin:12px 0 0 0;color:#94a3b8;font-size:12px;line-height:1.5;">
            Você recebe este email porque tem conta no AprovaOAB.<br>
            <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#94a3b8;text-decoration:underline;">Descadastrar desta newsletter</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ── Edição #1 (dados reais do banco: Constitucional, 25% de acerto) ───────────
export const EDICAO_1: NewsletterEdicao = {
  numero: 1,
  subject: "☕ Café com OAB #1 — a pegadinha de Constitucional que derrubou 75%",
  preheader: "Só 1 em cada 4 acertou esta questão de Direito Constitucional. Você acertaria?",
  intro: [
    "A reta rumo à aprovação tem uma vilã silenciosa: <strong>Direito Constitucional</strong>. Entre quem treinou na plataforma essa semana, foi a matéria que mais derrubou — só 1 em cada 4 acertou.",
    "Constitucional cai muito e cai com pegadinha. Por isso a edição de hoje é toda sobre não cair na armadilha mais clássica da FGV: a do <em>“é só pedir licença do cargo”</em>.",
  ],
  termometro:
    "🔴 <strong>Direito Constitucional — 25% de acerto.</strong> A matéria que mais reprovou entre os treinos da plataforma. Se você anda enrolado nela, não está sozinho.",
  questao: {
    fonte: "FGV · Exame de Ordem XXXIX/2023 · só 25% acertaram",
    enunciado:
      "Bento de Souza, governador do Estado Alfa, reconhecido como grande gestor público, foi indicado para assumir a presidência da Petrobras pelo Presidente da República. Honrado com o convite e inclinado a aceitá-lo, busca orientação com seu advogado(a) a respeito da possibilidade de cumular os dois cargos. Com base no ordenamento jurídico-constitucional brasileiro, assinale a opção que indica a orientação dada pelo(a) advogado(a).",
    alternativas: [
      { letra: "A", texto: "Caso aceite o convite para a Petrobras, perderá o mandato de governador." },
      { letra: "B", texto: "Pode assumir o cargo na Petrobras se pedir licença do mandato, a ele podendo retornar caso se exonere da estatal." },
      { letra: "C", texto: "Pode acumular os dois cargos, optando por uma das remunerações." },
      { letra: "D", texto: "Após a diplomação, mesmo renunciando ao governo, está proibido de assumir o cargo na Petrobras no período do mandato." },
    ],
    gabarito: "A",
    comentario:
      "O governador que aceita cargo ou função na administração pública perde o mandato. É uma vedação constitucional para preservar a dedicação integral ao cargo eletivo — quem o povo elegeu para governar não pode trocar a cadeira por um cargo de indicação sem abrir mão do mandato.",
  },
  pegadinha:
    "A alternativa <strong>B</strong> é uma cilada de mestre: o <em>“pede licença e depois volta”</em> soa familiar porque é assim que funciona com os <strong>parlamentares</strong> — um deputado ou senador pode se licenciar para assumir, por exemplo, um ministério sem perder o mandato (CF, art. 56). A FGV aposta que você vai estender essa lógica do Legislativo ao chefe do Executivo. 🧠 <strong>Fixa assim:</strong> governador <strong>não</strong> tem essa “licença com volta” para ocupar cargo na administração — aceitou o cargo, perdeu o mandato. Sem meio-termo.",
  noticia: {
    titulo: "📰 Tá rolando: saiu o calendário do 47º Exame",
    texto:
      "A FGV publicou o edital do <strong>47º Exame de Ordem</strong>. A <strong>1ª fase</strong> (prova objetiva) será em <strong>6 de setembro de 2026</strong> e a <strong>2ª fase</strong> em <strong>18 de outubro</strong>. O relógio começou a correr — e quem organiza os estudos desde já larga na frente. ⏰",
  },
  curiosidade: {
    titulo: "💡 Você sabia?",
    texto:
      "A Constituição de 1988 ganhou o apelido de <strong>“Constituição Cidadã”</strong> na voz de Ulysses Guimarães, presidente da Assembleia Nacional Constituinte, no discurso de promulgação em 5 de outubro de 1988. O apelido pegou pelo enorme rol de direitos e garantias fundamentais que ela inaugurou — justamente o terreno onde a FGV mais arma pegadinhas. 😉",
  },
  dica: "Constitucional é a matéria que mais paga em pontos por hora estudada — cai muito e a base é decorável. Reserve 20 minutos hoje só pra vedações e perda de mandato. É tema recorrente.",
  examDays: 90,
}

// ── Edição #2 (dados reais do banco: Direito Penal, 13% de acerto) ────────────
export const EDICAO_2: NewsletterEdicao = {
  numero: 2,
  subject: "☕ Café com OAB #2 — a pegadinha de Penal que só 13% acertaram",
  preheader: "Lei nova reduz a pena, depois é revogada. O réu ainda tem direito? 87% erraram.",
  intro: [
    "As inscrições do <strong>47º Exame</strong> fecharam no dia 8 — acabou o “depois eu resolvo”. De hoje até a 1ª fase são <strong>82 dias</strong>. É a reta em que organização vence esforço solto.",
    "E pra começar a semana acordado, trouxe a armadilha de <strong>Direito Penal</strong> que derrubou quase todo mundo que treinou na plataforma: a da <em>“lei nova que reduz a pena… e depois é revogada”</em>. Parece pegadinha de prova porque é. 🧠",
  ],
  termometro:
    "🔴 <strong>Direito Penal — 13% de acerto.</strong> A questão de retroatividade da lei penal mais benéfica derrubou quase todo mundo que a respondeu essa semana. Só 1 em cada 8 acertou.",
  questao: {
    fonte: "FGV · Exame de Ordem XLII/2024 · só 13% acertaram",
    enunciado:
      "Joelerson, foragido, com longa lista de antecedentes criminais, foi condenado ao cumprimento de uma pena privativa de liberdade de 24 anos de reclusão, mínima prevista para o delito que cometeu (extorsão mediante sequestro seguida de morte, Art. 159, § 3º, do Código Penal). No dia seguinte ao trânsito em julgado da condenação, entrou em vigor a Lei A, que reduziu a pena mínima para o delito referido, fixando-a em 20 (vinte) anos de reclusão. Após intensa reação midiática, a Lei B revogou a Lei A, restabelecendo o patamar sancionatório mínimo anteriormente previsto. No dia seguinte à entrada em vigor da Lei B, Joelerson foi capturado e iniciou o cumprimento da pena. Diante dessa situação hipotética, assinale a afirmativa correta.",
    alternativas: [
      { letra: "A", texto: "Joelerson somente faria jus à redução da pena se a execução da condenação fosse iniciada antes da entrada em vigor da Lei A." },
      { letra: "B", texto: "Joelerson somente faria jus à redução da pena se a execução da condenação fosse iniciada antes da entrada em vigor da Lei B." },
      { letra: "C", texto: "Joelerson faz jus à redução da pena, independentemente do trânsito em julgado da sentença condenatória e da entrada em vigor da Lei B." },
      { letra: "D", texto: "Joelerson não faz jus à redução da pena, pois ambas as leis citadas entraram em vigor após o trânsito em julgado da sentença condenatória." },
    ],
    gabarito: "C",
    comentario:
      "A lei penal mais benéfica retroage para alcançar fatos anteriores — inclusive depois do trânsito em julgado (CF, art. 5º, XL; CP, art. 2º, parágrafo único). A Lei A reduziu a pena mínima e, mesmo tendo sido revogada pela Lei B, é a chamada lei intermediária mais benéfica: aplica-se a lei mais favorável que existiu no caminho, ainda que já não esteja em vigor. Por isso Joelerson faz jus à redução, independentemente do trânsito em julgado e da entrada em vigor da Lei B.",
  },
  pegadinha:
    "A maioria marcou <strong>D</strong>, convencida de que, com a sentença já transitada em julgado, “lei nova não mexe mais”. Erro clássico: a lei penal mais benéfica retroage <strong>sempre</strong> — até depois da coisa julgada (CF, art. 5º, XL; CP, art. 2º, parágrafo único). E tem uma segunda camada que a FGV adora: a Lei A vigorou por pouco tempo e foi revogada, mas é uma <strong>lei intermediária mais benéfica</strong> — e se aplica a lei mais favorável que existiu no caminho, ainda que já “morta”. 🧠 <strong>Fixa assim:</strong> entre leis penais no tempo, vence sempre a mais benéfica — mesmo que ela tenha durado um dia.",
  noticia: {
    titulo: "📰 Tá rolando: inscrições do 47 encerradas, agora é reta de preparação",
    texto:
      "Acabou o prazo de inscrição do <strong>47º Exame de Ordem</strong> (1º a 8 de junho). Agora é só estudo: os <strong>locais de prova</strong> da 1ª fase saem em <strong>31 de agosto</strong> e a prova objetiva é em <strong>6 de setembro de 2026</strong>. Quem transformar esses ~80 dias em rotina, e não em maratona de véspera, chega na frente. ⏰",
  },
  curiosidade: {
    titulo: "💡 Você sabia?",
    texto:
      "O <strong>Código Penal</strong> que você estuda hoje é o <strong>Decreto-Lei nº 2.848, de 1940</strong> — está em vigor há mais de <strong>80 anos</strong>, bem antes da Constituição de 1988. Ele já foi remendado dezenas de vezes (a Parte Geral inteira foi reescrita em 1984), mas a espinha dorsal é a mesma desde a era Vargas. Por isso princípios como o da retroatividade da lei mais benéfica são tão cobrados: eles costuram um código antigo às mudanças que não param de chegar. 😉",
  },
  dica: "Lei penal no tempo cai em quase todo exame e a regra é decorável: lei mais benéfica sempre retroage, lei mais severa nunca. Reserve 15 minutos hoje pro art. 2º do Código Penal e o art. 5º, XL, da Constituição — é ponto fácil que muita gente entrega de bobeira.",
  examDays: 82,
}

// ── Edição #3 (dados reais do banco: Ética Profissional, 39% de acerto) ───────
export const EDICAO_3: NewsletterEdicao = {
  numero: 3,
  subject: "☕ Café com OAB #3 — a pegadinha de Ética que 6 em cada 10 erram",
  preheader: "O advogado responde sempre junto com o cliente na lide temerária? Cuidado com o “sempre”.",
  intro: [
    "Inscrição encerrada, choro nenhum: agora é estudo puro. Da sua mesa até a 1ª fase são <strong>75 dias</strong> — a prova objetiva é <strong>6 de setembro</strong>. É a reta em que constância vence intensidade: quem faz 1h todo dia chega na frente de quem vira a noite na véspera.",
    "E pra começar a semana acordado, a matéria que parece a mais tranquila e é onde a galera mais se entrega: <strong>Ética e Estatuto da OAB</strong>. Na plataforma, só 39% acertam — <strong>6 em cada 10 erram</strong>. A pegadinha de hoje é a clássica da <em>lide temerária</em>: o advogado responde junto com o cliente? Depende. ⚖️",
  ],
  termometro:
    "🔴 <strong>Ética Profissional — 39% de acerto na plataforma.</strong> 6 em cada 10 candidatos erram. É uma das matérias de maior peso na 1ª fase e, ainda assim, a que mais escorrega — porque quase todo mundo acha que “já sabe”.",
  questao: {
    fonte: "FGV · Exame de Ordem XLII/2024 · Ética e Estatuto da OAB",
    enunciado:
      "O advogado Antônio Carlos ajuizou, em favor de sua cliente Celina, lide manifestamente temerária em face de João. A esse respeito, à luz do Estatuto da Advocacia e da OAB, assinale a afirmativa correta.",
    alternativas: [
      { letra: "A", texto: "A responsabilidade de Antônio Carlos e Celina será solidária, independentemente do intuito de lesar João, parte contrária." },
      { letra: "B", texto: "Não há responsabilidade solidária entre Celina e Antônio Carlos se comprovado que não estavam coligados nos seus intuitos." },
      { letra: "C", texto: "Celina poderá ser responsabilizada se comprovada a violação do dever de cuidado, ao constar como parte autora no processo, ainda que não esteja coligada com seu advogado." },
      { letra: "D", texto: "Caso comprovado que Celina não sabia do conteúdo temerário da lide, Antônio Carlos não poderá ser civilmente responsável de forma isolada, porque a responsabilização do advogado exige participação dolosa de Celina." },
    ],
    gabarito: "B",
    comentario:
      "Em regra, o advogado responde pelos atos que praticar com dolo ou culpa no exercício profissional (Estatuto, art. 32). Mas, na lide temerária, a responsabilidade solidária com o cliente só nasce se ficar provado que os dois estavam coligados para lesar a parte contrária (art. 32, parágrafo único). Sem esse conluio, não há solidariedade — por isso a alternativa B está correta.",
  },
  pegadinha:
    "A maioria marca <strong>A</strong>, achando que o advogado que entra com uma lide temerária responde <em>automaticamente</em> junto com o cliente. Erro: a lei exige que os dois estejam <strong>coligados para lesar</strong> a parte contrária — é o intuito comum que gera a solidariedade, não o simples fato de a ação ser temerária (Estatuto, art. 32, parágrafo único). 🧠 <strong>Fixa assim:</strong> lide temerária só gruda no advogado se houver <strong>conluio</strong> com o cliente. Sem combinação pra prejudicar o outro lado, cada um responde por si.",
  noticia: {
    titulo: "📰 Tá rolando: a reta final do 47 começou",
    texto:
      "Com as inscrições encerradas, o <strong>47º Exame de Ordem</strong> entra na fase de estudo puro. Faltam <strong>75 dias</strong> pra 1ª fase (<strong>6 de setembro</strong>). Próximos marcos do calendário: o <strong>resultado preliminar da isenção</strong> da taxa sai em <strong>6 de julho</strong> e o <strong>pagamento da inscrição</strong> vai até <strong>31 de julho</strong>. Anota aí pra não perder prazo. ⏰",
  },
  curiosidade: {
    titulo: "💡 Você sabia?",
    texto:
      "O <strong>Exame de Ordem</strong> que você vai encarar tem aval do Supremo: em 2011, o STF declarou a <strong>constitucionalidade</strong> da exigência do exame para o exercício da advocacia (RE 603.583, em repercussão geral). Ou seja, não é capricho da OAB — é requisito legal validado pela mais alta corte do país. Bola pra frente. 💪",
  },
  dica: "Ética e Estatuto da OAB é peso alto na 1ª fase e das matérias mais decoráveis — o melhor custo-benefício por hora estudada. Reserve 15 minutos hoje pra responsabilidade do advogado (art. 32 do Estatuto) e honorários: é tema que cai praticamente todo exame.",
  examDays: 75,
}

// ── Edição #4 (dados reais do banco: Processo Penal, 29% de acerto) ───────────
export const EDICAO_4: NewsletterEdicao = {
  numero: 4,
  subject: "☕ Café com OAB #4 — a pegadinha de Processo Penal que 7 em cada 10 erram",
  preheader: "O Tribunal concedeu o habeas corpus por um motivo que o advogado nem tinha pedido. Pode fazer isso?",
  intro: [
    "Julho chegou e já traz o primeiro marco da reta: <strong>no dia 6 sai o resultado preliminar da isenção</strong> da taxa do 47º Exame, e quem vai pagar tem até <strong>31 de julho</strong> pra quitar o boleto e garantir a vaga. Prazo perdido não volta — anota aí. ⏰",
    "E a matéria de hoje é a que mais tem derrubado quem treina na plataforma: <strong>Processo Penal</strong>. Só 29% acertam — <strong>7 em cada 10 erram</strong>. A pegadinha da vez é de <em>habeas corpus</em>: o Tribunal pode conceder a ordem por um fundamento que o advogado nem chegou a pedir? A resposta engana muita gente boa. ⚖️",
  ],
  termometro:
    "🔴 <strong>Processo Penal — 29% de acerto na plataforma.</strong> A matéria que mais derruba entre os treinos: 7 em cada 10 erram. É onde a FGV mais cobra detalhe fino — prazo, competência, nulidade — e onde se separa quem decorou de quem entendeu.",
  questao: {
    fonte: "FGV · Exame de Ordem XLII/2024 · das questões de Processo Penal que mais derrubam na plataforma",
    enunciado:
      "Amanda impetra habeas corpus em favor de Telma, que foi presa preventivamente por decisão do Juiz de Primeiro Grau, sendo acusada da prática de crime hediondo. O habeas corpus foi impetrado com o argumento de excesso de prazo. O Tribunal concedeu a ordem de habeas corpus de ofício, fundamentado na incompetência do juiz que decretou a prisão. Sobre a hipótese narrada, assinale a afirmativa correta.",
    alternativas: [
      { letra: "A", texto: "O Tribunal equivocou-se, uma vez que a incompetência do julgador não é fundamento para a concessão de habeas corpus." },
      { letra: "B", texto: "O Tribunal agiu de modo correto, uma vez que é possível a concessão de habeas corpus de ofício sempre que houver constrangimento ilegal." },
      { letra: "C", texto: "O Tribunal agiu de modo correto, pois a incompetência do Juízo é o único fundamento que admite a concessão da ordem de habeas corpus de ofício." },
      { letra: "D", texto: "O Tribunal equivocou-se, pois fica vinculado aos argumentos apontados pelo impetrante do habeas corpus, sendo inadmissível a concessão de habeas corpus de ofício." },
    ],
    gabarito: "B",
    comentario:
      "O habeas corpus é a garantia contra qualquer coação ilegal à liberdade — e o juiz ou tribunal pode concedê-lo <strong>de ofício</strong> sempre que enxergar constrangimento ilegal, ainda que por fundamento diferente do que se pediu (CPP, art. 654, § 2º). Aqui o impetrante alegou excesso de prazo, mas o Tribunal identificou algo mais grave — a incompetência de quem decretou a prisão (CPP, art. 648, III) — e concedeu a ordem. Podia: no HC não vale a “adstrição” dos recursos comuns; o que importa é fazer cessar a ilegalidade.",
  },
  pegadinha:
    "A cilada mora na letra <strong>D</strong>: parece lógico que o Tribunal só possa decidir <em>dentro</em> do que o advogado pediu. É assim nos recursos comuns — vale o <em>tantum devolutum quantum appellatum</em> (o tribunal só julga o que lhe foi devolvido). Mas <strong>habeas corpus não é recurso, é garantia</strong>: o juiz concede de ofício e não fica preso aos fundamentos do impetrante (CPP, art. 654, § 2º). E cuidado com a letra C, que enfia um <em>“único fundamento”</em> — a incompetência é <strong>uma</strong> das hipóteses de coação ilegal (art. 648), longe de ser a única. 🧠 <strong>Fixa assim:</strong> no HC, havendo ilegalidade, o tribunal corrige — pedida ou não.",
  noticia: {
    titulo: "📰 Tá rolando: julho é mês de prazo no 47º Exame",
    texto:
      "Começou a maratona de datas do <strong>47º Exame de Ordem</strong>. No dia <strong>6 de julho</strong> sai o <strong>resultado preliminar da isenção</strong> da taxa; o <strong>definitivo</strong> vem em <strong>29 de julho</strong>. Quem vai pagar tem até <strong>31 de julho</strong> pra quitar o boleto da inscrição. Depois é estudo puro até os <strong>locais de prova</strong> saírem, em <strong>31 de agosto</strong> — a 1ª fase é em <strong>6 de setembro</strong>. ⏰",
  },
  curiosidade: {
    titulo: "💡 Você sabia?",
    texto:
      "O <strong>habeas corpus</strong> é o único instrumento do processo penal que <strong>qualquer pessoa</strong> pode impetrar — sem ser advogado e sem procuração (CPP, art. 654). Foi o que a Amanda da questão fez: pediu a ordem em favor de outra pessoa. Um parente, um amigo, o próprio preso ou o Ministério Público podem impetrar; e o juiz, como você viu, pode concedê-lo de ofício. É o remédio mais democrático do processo penal. 💪",
  },
  dica: "Processo Penal cai muito e vive de detalhe: prazo, competência, nulidade e — campeão de recorrência — o habeas corpus. Reserve 15 minutos hoje pras hipóteses de coação ilegal (CPP, art. 648) e pra quem pode impetrar e conceder o HC (art. 654). É base enxuta que rende ponto fácil.",
  examDays: 67,
}

// ── Edição #5 (dados reais do banco: Direito Administrativo, 36% de acerto) ───
export const EDICAO_5: NewsletterEdicao = {
  numero: 5,
  subject: "☕ Café com OAB #5 — improbidade culposa: a pegadinha da lei que mudou",
  preheader:
    "A FGV cobra a Lei de Improbidade nova de quem estudou pela antiga. E atenção: o recurso da isenção do 47º é hoje.",
  intro: [
    "Semana de prazo curto: saiu ontem (6/7) o <strong>resultado preliminar da isenção</strong> da taxa do 47º Exame, no portal da FGV. Teve o pedido negado? O <strong>recurso é HOJE</strong>, terça (7/7), até 23h59 de Brasília. Depois disso, é boleto até 31 de julho. ⏰",
    "E a matéria de hoje é das que mais derrubam quem treina na plataforma: <strong>Direito Administrativo</strong> — só 36% acertam, <strong>quase 2 em cada 3 erram</strong>. A pegadinha da vez é cruel de propósito: a FGV cobra a <em>Lei de Improbidade reformada</em> apostando que você estudou pela redação antiga. Quem decorou o resumo de 2020 marca a errada com toda a confiança do mundo. ⚖️",
  ],
  termometro:
    "🔴 <strong>Direito Administrativo — 36% de acerto na plataforma.</strong> Quase 2 em cada 3 erram. É a matéria em que a lei seca mais mudou nos últimos anos — improbidade reformada (Lei 14.230/2021), licitações novas (Lei 14.133/2021) — e onde material desatualizado custa mais caro.",
  questao: {
    fonte: "FGV · Exame de Ordem XLIII/2024 · das questões de Administrativo que mais derrubam na plataforma",
    enunciado:
      "Januário, ex-prefeito do Município Imaginário, teve conhecimento de um inquérito civil que tem por objeto avaliar condutas praticadas no exercício de seu mandato que se enquadram como atos de improbidade e que causaram prejuízo ao erário. Em razão disso, ele procurou você, na qualidade de advogada(o), para definir uma estratégia de defesa, destacando que tem provas de que atuou de forma culposa. Considerando o fato de a conduta ter sido culposa, à luz do disposto na Lei nº 8.429/1992, com a redação conferida pela Lei nº 14.230/2021, assinale a opção que apresenta, corretamente, a orientação jurídica prestada.",
    alternativas: [
      { letra: "A", texto: "O fato é determinante para a estratégia de defesa, na medida em que os atos de improbidade não mais podem ser caracterizados na modalidade culposa." },
      { letra: "B", texto: "O fato é importante para a estratégia de defesa, para fins de redução da pena, pois os atos de improbidade que ocasionam prejuízo ao erário admitem a modalidade culposa." },
      { letra: "C", texto: "O fato é desinfluente para a respectiva estratégia de defesa, em um primeiro momento, pois os atos de improbidade admitem tanto a modalidade culposa quanto a dolosa." },
      { letra: "D", texto: "O fato não tem muita relevância para a estratégia de defesa, na medida em que a responsabilização por improbidade administrativa é objetiva." },
    ],
    gabarito: "A",
    comentario:
      "A Lei 14.230/2021 reescreveu a Lei de Improbidade (Lei 8.429/92): agora <strong>todo ato de improbidade exige dolo</strong> — a vontade livre e consciente de alcançar o resultado ilícito (art. 1º, §§ 1º a 3º). A modalidade culposa, que existia para os atos que causam prejuízo ao erário, foi extinta. Se Januário tem provas de que agiu apenas com culpa, a conduta não configura mais improbidade — e o STF confirmou que a extinção vale inclusive para fatos anteriores ainda sem condenação definitiva (Tema 1.199). Determinante para a defesa.",
  },
  pegadinha:
    "A cilada da letra <strong>B</strong> é que ela já foi verdade: até 2021, o art. 10 da Lei 8.429/92 admitia improbidade <strong>culposa</strong> nos atos que causam prejuízo ao erário — quem decorou isso marca B sem piscar. A Lei 14.230/2021 mudou o jogo: improbidade agora é <strong>só dolosa</strong>, em todas as modalidades (enriquecimento ilícito, prejuízo ao erário, violação de princípios). E a letra D erra por outro clássico: responsabilidade por improbidade nunca foi objetiva. 🧠 <strong>Fixa assim:</strong> improbidade sem dolo não é improbidade — o dano culposo pode ser cobrado por outras vias, mas não pelas sanções da Lei de Improbidade.",
  noticia: {
    titulo: "📰 Tá rolando: recurso da isenção é hoje; Edital Complementar vem dia 24",
    texto:
      "O <strong>resultado preliminar da isenção</strong> da taxa do 47º Exame saiu em <strong>6 de julho</strong>, no portal da FGV. Quem foi indeferido pode <strong>recorrer só hoje, 7 de julho</strong> (até 23h59, horário de Brasília). O resultado <strong>definitivo</strong> sai em <strong>29 de julho</strong> e, sem isenção, o boleto (R$ 350) vence em <strong>31 de julho</strong>. Nos próximos marcos: <strong>Edital Complementar em 24 de julho</strong>, locais de prova em <strong>31 de agosto</strong> e 1ª fase em <strong>6 de setembro</strong>. ⏰",
  },
  curiosidade: {
    titulo: "💡 Você sabia?",
    texto:
      "<strong>Improbidade administrativa não é crime.</strong> A ação de improbidade é <strong>cível</strong>: as sanções são perda da função pública, suspensão dos direitos políticos, multa e proibição de contratar com o poder público — “sem prejuízo da ação penal cabível”, como diz a própria Constituição (art. 37, § 4º). Ou seja: o mesmo fato pode gerar ação de improbidade E processo criminal, em trilhos separados. É por isso que ninguém “vai preso por improbidade” — mas pode perder o cargo e os direitos políticos. 😉",
  },
  dica: "Administrativo é a matéria em que resumo velho mais derruba: improbidade (Lei 14.230/2021) e licitações (Lei 14.133/2021) mudaram de corpo inteiro. Reserve 15 minutos hoje pro art. 1º, §§ 1º a 3º, da Lei 8.429/92 na redação nova — e desconfie de qualquer material anterior a 2021.",
  examDays: 61,
}

// ── Edição #6 (dados reais do banco: Direito Ambiental, 38% de acerto) ────────
export const EDICAO_6: NewsletterEdicao = {
  numero: 6,
  subject: "☕ Café com OAB #6 — EIA × EIV: a pegadinha de Ambiental que ninguém acertou",
  preheader:
    "O estudo municipal dispensa o EIA? Ninguém acertou essa na plataforma. E o Edital Complementar do 47º sai dia 24.",
  intro: [
    "Semana de calendário cheio: o <strong>Edital Complementar do 47º Exame</strong> — que regula o reaproveitamento da 1ª fase pra quem passou na objetiva do 46 — sai dia <strong>24 de julho</strong>. Quem fez a 2ª fase do 46 também tem data: o <strong>padrão de respostas definitivo sai hoje</strong>, terça (14/7), com recursos de <strong>15 a 17</strong>. E o boleto do 47 vence <strong>31 de julho</strong> — prazo perdido não volta. ⏰",
    "A matéria de hoje é a que mais derruba entre as que ainda não passaram por aqui: <strong>Direito Ambiental</strong> — só 38% acertam, <strong>6 em cada 10 erram</strong>. A pegadinha da vez é a sopa de letrinhas favorita da FGV: o empreendimento precisa de <em>EIA</em>, mas a lei municipal exige <em>EIV</em>… um estudo dispensa o outro? Na plataforma, <strong>ninguém acertou</strong> essa. ⚖️",
  ],
  termometro:
    "🔴 <strong>Direito Ambiental — 38% de acerto na plataforma.</strong> 6 em cada 10 erram. É a matéria das siglas — EIA, EIV, RIMA, APP, LC 140 — e a FGV cobra exatamente a fronteira entre elas: quem licencia o quê, qual estudo serve pra quê e quando um NÃO substitui o outro.",
  questao: {
    fonte: "FGV · Exame de Ordem XLIV/2024 · a questão de Ambiental que ninguém acertou na plataforma",
    enunciado:
      "A sociedade empresária Empreendedorix deseja construir um grande shopping center em terreno situado na área urbana do Município Delta, que contribuirá para incrementar o comércio na localidade, mas surtirá efeitos na qualidade de vida da população e no meio ambiente do entorno, razão pela qual a atividade se enquadra entre aquelas para as quais é necessária a elaboração de Estudo de Impacto Ambiental (EIA). Ocorre que o Município Delta tem legislação local que define que tal empreendimento privado depende de elaboração de Estudo Prévio de Impacto de Vizinhança (EIV), para obter as licenças ou autorizações de construção, ampliação ou funcionamento a cargo do Poder Público local. Em razão disso, os representantes da sociedade empresária Empreendedorix procuram você, como advogado(a), para esclarecer as peculiaridades do instrumento previsto na referida legislação municipal. Considerando os fatos narrados, assinale a afirmativa correta.",
    alternativas: [
      { letra: "A", texto: "O EIV, diferentemente do EIA, não pode ser enquadrado como instrumento da Política Nacional do Meio Ambiente." },
      { letra: "B", texto: "A realização do EIV não substitui a elaboração e a aprovação do EIA, requeridas nos termos da legislação ambiental." },
      { letra: "C", texto: "O EIV será executado de forma a contemplar seus efeitos positivos, mas não precisa apontar os efeitos negativos do empreendimento, diante de seus objetivos legítimos." },
      { letra: "D", texto: "Independentemente de previsão na lei municipal, o EIV seria necessário, considerando o grande empreendimento a ser realizado pela sociedade Empreendedorix." },
    ],
    gabarito: "B",
    comentario:
      "O Estatuto da Cidade é expresso: <strong>a elaboração do EIV não substitui o EIA</strong> (Lei 10.257/2001, art. 38). São estudos de trilhos diferentes — o <strong>EIV</strong> olha a vizinhança (adensamento populacional, tráfego, valorização imobiliária, paisagem urbana; art. 37), enquanto o <strong>EIA</strong> olha a degradação ambiental significativa e tem assento na própria Constituição (art. 225, § 1º, IV). Um shopping desse porte pode precisar dos <strong>dois, cumulativamente</strong>: o EIV pra licença urbanística municipal e o EIA pro licenciamento ambiental.",
  },
  pegadinha:
    "A letra <strong>D</strong> seduz pelo instinto protetor: “empreendimento grande → EIV obrigatório, com ou sem lei”. Errado — o EIV é criatura da lei municipal: é a <strong>lei do Município</strong> que define quais empreendimentos dependem dele (Estatuto da Cidade, art. 36). Sem previsão local, não há EIV exigível. E a letra <strong>A</strong> derruba até os finalistas: o EIV nasce no Estatuto da Cidade, mas cabe no gênero <em>“avaliação de impactos ambientais”</em>, que é instrumento da Política Nacional do Meio Ambiente (Lei 6.938/81, art. 9º, III) — dizer que ele “não pode ser enquadrado” é falso. 🧠 <strong>Fixa assim:</strong> EIV e EIA <strong>não se substituem</strong> (art. 38) — cada um no seu trilho, e o empreendimento pode ter que apresentar os dois.",
  noticia: {
    titulo: "📰 Tá rolando: Edital Complementar dia 24 e semana decisiva pro 46",
    texto:
      "O cronograma oficial da OAB confirma: o <strong>Edital Complementar</strong> do 47º Exame — reaproveitamento da 1ª fase pra quem passou na objetiva do 46 — sai em <strong>24 de julho</strong>, com inscrições de <strong>31/7 a 7/8</strong>. Pra quem fez a 2ª fase do 46: o <strong>padrão de respostas definitivo</strong> sai <strong>hoje (14/7)</strong>, recursos de <strong>15 a 17/7</strong> e <strong>resultado final em 29/7</strong> — mesmo dia do resultado definitivo da isenção do 47. E atenção: o <strong>boleto de inscrição (R$ 350) vence 31 de julho</strong>. Depois disso, locais de prova em <strong>31/8</strong> e 1ª fase em <strong>6/9</strong>. ⏰",
  },
  curiosidade: {
    titulo: "💡 Você sabia?",
    texto:
      "A Constituição de 1988 foi a <strong>primeira da história do Brasil</strong> a dedicar um capítulo inteiro ao meio ambiente — daí o apelido de <strong>“Constituição Verde”</strong>. O art. 225 declarou o meio ambiente equilibrado <em>“bem de uso comum do povo”</em> e, no § 1º, IV, constitucionalizou o <strong>EIA</strong>: estudo prévio de impacto ambiental, exigível para obra ou atividade potencialmente causadora de <strong>significativa</strong> degradação. Ou seja: o EIA da questão de hoje não é detalhe de lei ordinária — é mandamento constitucional. 😉",
  },
  dica: "Ambiental vive de fronteira entre siglas: EIA × EIV × RIMA e a LC 140/2011 (quem licencia o quê). Reserve 15 minutos hoje pros arts. 36 a 38 do Estatuto da Cidade e pro art. 225, § 1º, IV, da Constituição — essa dupla resolve boa parte das questões de estudo de impacto.",
  examDays: 54,
}

// ── Edição #7 (dados reais do banco: Processo Civil, 37% de acerto) ───────────
export const EDICAO_7: NewsletterEdicao = {
  numero: 7,
  subject: "☕ Café com OAB #7 — O \"recurso\" que a Fazenda ganha sem pedir",
  preheader:
    "Só 1 em cada 4 acertou essa de remessa necessária na plataforma. E os recursos da 2ª fase do 46 já fecharam — resultado final sai dia 29.",
  intro: [
    "Semana de transição no calendário: os recursos contra o padrão de respostas da <strong>2ª fase do 46º Exame</strong> fecharam <strong>sexta (17/7)</strong> — agora é aguardar o <strong>resultado final, em 29 de julho</strong>. Enquanto isso, o <strong>Edital Complementar do 47º</strong> (reaproveitamento da 1ª fase pra quem passou na objetiva do 46) sai <strong>quinta (24/7)</strong>, com inscrições de 31/7 a 7/8. E o boleto do 47 (R$ 350) vence <strong>31 de julho</strong> — sem prorrogação. ⏰",
    "A matéria de hoje é <strong>Processo Civil</strong> — 37% de acerto na plataforma, quase <strong>2 em cada 3 erram</strong>. E tem uma questão específica que só <strong>1 em cada 4</strong> acertou: a diferença entre um recurso de verdade e a <em>remessa necessária</em> — aquele reexame que o Tribunal faz de ofício quando a Fazenda Pública perde, mesmo que ela não recorra de nada. ⚖️",
  ],
  termometro:
    "🔴 <strong>Processo Civil — 37% de acerto na plataforma.</strong> Quase 2 em cada 3 erram. A matéria concentra os institutos que mais confundem quem estuda por resumo: prazos, natureza da decisão (interlocutória × sentença) e as exceções que a lei processual empilha em cima da regra geral.",
  questao: {
    fonte: "FGV · Exame de Ordem XLIII/2024 · a questão de Processo Civil que só 1 em cada 4 acertou na plataforma",
    enunciado:
      "Maria ajuizou ação em face da União, com pedido de condenação desta à entrega de remédios, por ser portadora de grave doença cardíaca. Após o regular processamento, o Juízo da Vara Federal competente proferiu sentença de procedência condenando a União a entregar o medicamento solicitado. A Fazenda Pública foi vencida e, na hipótese, foi aplicado pelo Juiz o instituto da remessa necessária, com o envio do processo ao Tribunal Regional Federal, embora a União não tenha apelado da sentença. Acerca da remessa necessária, segundo o ordenamento jurídico brasileiro, assinale a afirmativa correta.",
    alternativas: [
      { letra: "A", texto: "Aplica-se a remessa necessária quando a sentença estiver fundada em entendimento firmado em incidente de assunção de competência." },
      { letra: "B", texto: "Aplica-se a remessa necessária quando a condenação ou o proveito econômico obtido na causa for de valor certo e líquido inferior a mil salários mínimos para a União." },
      { letra: "C", texto: "Não se aplica a remessa necessária aos casos de competência de Juizados Especiais da Fazenda Pública, mas pode ser aplicada às sentenças de ações ajuizadas em Varas Federais." },
      { letra: "D", texto: "Como a União não interpôs o recurso de apelação no prazo legal, o Juiz não poderá ordenar a remessa do processo para o reexame necessário no Tribunal, independentemente do valor dos remédios." },
    ],
    gabarito: "C",
    comentario:
      "A remessa necessária (art. 496 do CPC) é <strong>condição de eficácia da sentença</strong>, não um recurso — o juiz manda o processo pro Tribunal de ofício sempre que a Fazenda Pública perde, <strong>haja ou não apelação da parte</strong>. A Lei 12.153/2009, no art. 11, exclui expressamente esse reexame nos Juizados Especiais da Fazenda Pública — mas ele continua valendo em pleno vigor nas Varas Federais comuns, como no caso de Maria. É exatamente isso que a letra C descreve.",
  },
  pegadinha:
    "A letra <strong>D</strong> é a armadilha mais comum: parece lógico achar que \"se a União não recorreu, o juiz não pode mandar o processo pro Tribunal sozinho\". Errado — a remessa necessária é <strong>automática e independe de apelação</strong>; ela existe justamente pros casos em que a Fazenda não recorre. A letra <strong>B</strong> inverte o critério do art. 496, § 3º: a remessa necessária <strong>não se aplica</strong> quando o valor é inferior a mil salários mínimos pra União (é dispensa, não obrigação) — o texto trocou \"dispensa\" por \"aplica-se\". E a letra <strong>A</strong> inverte o § 4º: quando a sentença segue entendimento de incidente de assunção de competência (ou súmula de tribunal superior), a remessa necessária <strong>é dispensada</strong>, não obrigatória. 🧠 <strong>Fixa assim:</strong> remessa necessária roda por conta própria — o recurso da parte é personagem secundário nessa história.",
  noticia: {
    titulo: "📰 Tá rolando: recursos da 2ª fase do 46 fecharam, resultado final sai dia 29",
    texto:
      "O cronograma oficial da OAB confirma: o <strong>padrão de respostas definitivo</strong> da 2ª fase do 46º Exame saiu dia 14/7 e o prazo de <strong>recursos (15 a 17/7) já se encerrou</strong> — agora é aguardar o <strong>resultado final em 29 de julho</strong>, mesmo dia do resultado definitivo da isenção do 47. Pra quem mira o 47º: o <strong>Edital Complementar</strong> (reaproveitamento da 1ª fase pra quem passou na objetiva do 46) sai <strong>quinta (24/7)</strong>, com inscrições de <strong>31/7 a 7/8</strong>. E o <strong>boleto de inscrição do 47 (R$ 350) vence 31 de julho</strong> — depois disso, sai do ar. ⏰",
  },
  curiosidade: {
    titulo: "💡 Você sabia?",
    texto:
      "A remessa necessária é <strong>bem mais velha</strong> do que o CPC de 2015 — suas raízes estão nas <strong>Ordenações Filipinas de 1603</strong>, quando o instituto nasceu no processo penal português como proteção ao réu diante dos amplos poderes do juiz inquisidor. Só em <strong>1831</strong>, já no Brasil independente, uma lei (art. 90) estendeu a ideia ao processo civil — mas trocou o protegido: agora quem ganhava o reexame automático era a <strong>Fazenda Nacional</strong> sempre que perdia uma causa. Quase <strong>200 anos depois</strong>, a lógica de proteger o interesse público contra sentenças desfavoráveis à Fazenda continua de pé no art. 496 do CPC. 😉",
  },
  dica: "Processo Civil pune quem decora regra geral e esquece exceção. Reserve 15 minutos hoje pro art. 496, §§ 3º e 4º, do CPC (quando a remessa necessária é dispensada) e pro art. 11 da Lei 12.153/2009 (Juizados Especiais da Fazenda Pública) — essa dupla resolve a maioria das pegadinhas de remessa necessária.",
  examDays: 47,
}

// Edição "atual" — a que o cron semanal e o /send usam por padrão. Ao montar uma
// edição nova, atualize este ponteiro (ou edite o conteúdo acima).
export const CURRENT_EDICAO: NewsletterEdicao = EDICAO_7
