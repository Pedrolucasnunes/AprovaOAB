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

// Edição "atual" — a que o cron semanal e o /send usam por padrão. Ao montar uma
// edição nova, atualize este ponteiro (ou edite o conteúdo acima).
export const CURRENT_EDICAO: NewsletterEdicao = EDICAO_2
