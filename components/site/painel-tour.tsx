import type { CSSProperties, ReactNode } from "react";

import { Eyebrow } from "@/components/site/section-heading";

/**
 * Seção do painel — o painel se monta e acende conforme você rola.
 *
 * Server Component: zero JS, zero `"use client"`. Toda a mecânica (fixação,
 * montagem das cartas, câmera, contagem do número e item ativo) mora em
 * `app/globals.css`, pelo mesmo motivo do `components/site/reveal.tsx` —
 * condicionar conteúdo a JS já custou a landing inteira uma vez (`c00c3a7`).
 *
 * O ARCO: escuro, girado e desmontado → aceso, frontal e inteiro.
 *   · 0–12%  as cartas voam pro lugar (rápido, é o primeiro scroll)
 *   · 12–100% a câmera faz UM movimento contínuo: aproxima, endireita e acende
 *   · o 43% conta de 0 e troca de cor ao cruzar os 40 (a régua de `lib/metrics.ts`)
 *
 * A câmera NÃO passeia entre cartões. Quem marca o item ativo é um realce na
 * região correspondente. Isso é melhor que pan por dois motivos: a composição
 * final é a do produto inteiro (e não dois cartões num canto), e some o modo de
 * falha mais provável do desenho anterior — enquadramento calculado a partir do
 * layout interno, que erraria o alvo numa largura em que um cartão refluísse.
 *
 * TRÊS INVARIANTES, e nenhuma é estética:
 *
 * 1. AS TRÊS DESCRIÇÕES ESTÃO SEMPRE NO DOM. Só o destaque se move.
 * 2. O ESTADO DE REPOUSO É COMPLETO E ACESO. Sem `animation-timeline`, sem JS
 *    ou com movimento reduzido, a seção já é o quadro final da imagem 8:
 *    painel frontal, montado, claro, número em 43%. O modo de falha é "sem
 *    montagem", nunca "escuro" nem "vazio".
 * 3. A CAMADA DE MOVIMENTO SÓ TOCA `translate`, `rotate`, `scale`, `opacity`,
 *    cor e um contador. Nada que reflua: o CLS da landing é 0 e continua.
 */

const PASSOS = [
  {
    titulo: "Se eu passaria hoje",
    corpo:
      "A nota dos seus simulados contra os 50% que aprovam. Questão em branco conta como erro, igual no dia da prova.",
  },
  {
    titulo: "Onde eu perco pontos",
    corpo:
      "As disciplinas em que você mais erra, em ordem. Com pouca amostra a matéria fica “medindo”: duas questões não carimbam ninguém.",
  },
  {
    titulo: "O que treinar hoje",
    corpo:
      "O painel escolhe a matéria e abre o treino nela — cerca de 70% das questões nas suas piores. A semana já vem com o dia do simulado reservado.",
  },
] as const;

const RISCO = [
  { nome: "Processo Civil", taxa: 28, largura: 78, tom: "critico" },
  { nome: "Tributário", taxa: 34, largura: 95, tom: "critico" },
  { nome: "Empresarial", taxa: 41, largura: 114, tom: "medio" },
  { nome: "Administrativo", taxa: 44, largura: 123, tom: "medio" },
  { nome: "Previdenciário", taxa: null, largura: 22, tom: "medindo" },
] as const;

/**
 * `1.284` NAO rola, e os outros dois rolam. Nao e inconsistencia: um contador
 * de CSS imprime `counter(n)` sem separador de milhar, entao a rolagem passaria
 * por "1284" — um numero que o produto nunca escreve assim em pt-BR. Preferi
 * nao animar a mentir na formatacao.
 */
const STATS: {
  k: string;
  r: string;
  v: string;
  s: string;
  c: string;
  n?: number;
  sufixo?: string;
}[] = [
  {
    k: "stat1",
    r: "Taxa de acerto geral",
    v: "58%",
    s: "Treino e simulados somados",
    c: "text-night-foreground",
    n: 58,
    sufixo: "%",
  },
  {
    k: "stat2",
    r: "Questões resolvidas",
    v: "1.284",
    s: "Total acumulado",
    c: "text-night-foreground",
  },
  {
    k: "stat3",
    r: "Matérias em risco",
    v: "4",
    s: "Precisam de atenção urgente",
    c: "text-destructive",
    n: 4,
    sufixo: "",
  },
];

const HISTORICO = [
  { data: "12 out", exame: "47º Exame", acertos: 34, taxa: 43 },
  { data: "28 set", exame: "46º Exame", acertos: 31, taxa: 39 },
  { data: "14 set", exame: "45º Exame", acertos: 27, taxa: 34 },
] as const;

/**
 * Posição de partida de cada carta: de onde ela voa na montagem. Valores à mão
 * de propósito — distâncias e rotações irregulares leem como folhas soltas;
 * uma progressão regular leria como grade deslizando. `fim` escalona a chegada
 * (cada carta termina num ponto diferente da faixa), que é o que dá o efeito
 * de baralho se ajeitando em vez de bloco único.
 */
type Voo = {
  dx: string;
  dy: string;
  /** Profundidade de partida: + vem na direção de quem olha, − vem do fundo.
   *  É o que faz as cartas terem PARALAXE umas contra as outras enquanto o
   *  plano ainda está girado — sem Z, a montagem seria um desenho 2D
   *  inclinado, não um objeto. */
  dz: string;
  rx: string;
  ry: string;
  rot: string;
  fim: string;
};

function vooStyle(v: Voo): CSSProperties {
  return {
    "--dx": v.dx,
    "--dy": v.dy,
    "--dz": v.dz,
    "--rx": v.rx,
    "--ry": v.ry,
    "--rot": v.rot,
    "--fim": v.fim,
  } as CSSProperties;
}

const VOOS: Record<string, Voo> = {
  heroi: { dx: "-78px", dy: "54px", dz: "140px", rx: "8deg", ry: "-10deg", rot: "-3deg", fim: "13%" },
  evolucao: { dx: "96px", dy: "-58px", dz: "-90px", rx: "-6deg", ry: "12deg", rot: "2.6deg", fim: "10%" },
  stat1: { dx: "-54px", dy: "76px", dz: "60px", rx: "10deg", ry: "6deg", rot: "2deg", fim: "11%" },
  stat2: { dx: "26px", dy: "98px", dz: "-120px", rx: "-8deg", ry: "-6deg", rot: "-1.6deg", fim: "9%" },
  stat3: { dx: "88px", dy: "64px", dz: "110px", rx: "6deg", ry: "14deg", rot: "3deg", fim: "12%" },
  risco: { dx: "-96px", dy: "-46px", dz: "-70px", rx: "-10deg", ry: "-12deg", rot: "1.6deg", fim: "14%" },
  acao: { dx: "74px", dy: "-80px", dz: "160px", rx: "12deg", ry: "8deg", rot: "-2.6deg", fim: "10%" },
  agenda: { dx: "64px", dy: "108px", dz: "-50px", rx: "-6deg", ry: "10deg", rot: "2.2deg", fim: "12%" },
  historico: { dx: "-44px", dy: "118px", dz: "90px", rx: "9deg", ry: "-8deg", rot: "-1.4deg", fim: "13%" },
};

function corDaTaxa(tom: string) {
  if (tom === "critico") return "text-destructive";
  if (tom === "medio") return "text-warning";
  return "text-night-muted";
}

function corDaBarra(tom: string) {
  if (tom === "critico") return "bg-destructive";
  if (tom === "medio") return "bg-warning";
  return "bg-night-border";
}

function Rotulo({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="size-1.5 shrink-0 bg-primary" />
      <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-night-muted">
        {children}
      </span>
    </div>
  );
}

/** Uma carta do painel. `voo` é de onde ela parte na montagem. */
function Carta({
  voo,
  rotulo,
  titulo,
  className,
  regiao,
  children,
}: {
  voo: Voo;
  rotulo: string;
  titulo?: string;
  className?: string;
  /** Marca a carta como alvo de um dos três itens: ela acende na vez dele. */
  regiao?: 1 | 2 | 3;
  children?: ReactNode;
}) {
  return (
    <div
      className={`painel-tour__carta rounded-xl border border-night-border bg-night-card p-5 ${className ?? ""}`}
      style={vooStyle(voo)}
      data-regiao={regiao}
    >
      <Rotulo>{rotulo}</Rotulo>
      {titulo ? (
        <p className="mt-2 text-[17px] font-medium text-night-foreground">
          {titulo}
        </p>
      ) : null}
      {children}
    </div>
  );
}

/** A maquete do dashboard, em largura fixa: a câmera opera sobre ela. */
function Maquete() {
  return (
    <div className="painel-tour__3d flex w-[950px] flex-col">
      {/* Cabeçalho */}
      <div
        className="painel-tour__carta flex items-end justify-between pb-5"
        style={vooStyle({ dx: "-30px", dy: "-64px", dz: "40px", rx: "4deg", ry: "-4deg", rot: "-1deg", fim: "8%" })}
      >
        <div>
          <Rotulo>Visão geral</Rotulo>
          <p className="mt-1.5 text-[27px] font-medium tracking-tight text-night-foreground">
            Dashboard
          </p>
          <p className="text-xs text-night-muted">
            Acompanhe seu progresso e desempenho
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em]">
          <span className="px-3 py-1.5 text-night-muted">7 dias</span>
          <span className="px-3 py-1.5 text-night-muted">30 dias</span>
          <span className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground">
            Tudo
          </span>
        </div>
      </div>

      {/* Linha A — herói + evolução */}
      <div className="painel-tour__3d flex gap-[18px]">
        <Carta
          voo={VOOS.heroi}
          regiao={1}
          rotulo="Progresso"
          titulo="Seu progresso rumo à aprovação"
          className="w-[562px]"
        >
          <div className="mt-4 flex items-end gap-3">
            {/* O número real vive no DOM (sr-only) e a contagem desenha por
                cima: assim "43%" está no HTML servido mesmo enquanto o
                contador sobe, e o leitor de tela nunca ouve um número em
                movimento. */}
            <p
              className="painel-tour__n painel-tour__numero font-display text-[52px] font-semibold leading-none tracking-tight"
              style={{ "--n-alvo": 43 } as CSSProperties}
              data-sufixo="%"
            >
              <span className="sr-only">43%</span>
            </p>
            <p className="pb-1.5 text-[13px] text-night-muted">
              no último simulado · 34 de 80
            </p>
          </div>
          <div className="relative mt-7 h-[9px] w-[520px] rounded-full bg-night-border">
            <div className="painel-tour__barra h-[9px] rounded-full" />
            <div className="absolute -top-[5px] left-[260px] h-[19px] w-0.5 bg-primary" />
          </div>
          <div className="mt-2 flex w-[520px] justify-between font-mono text-[9px] uppercase tracking-[0.16em]">
            <span className="text-night-muted">Faltam 6 questões</span>
            <span className="text-primary">Meta 50%</span>
          </div>
        </Carta>

        <Carta
          voo={VOOS.evolucao}
          rotulo="Evolução"
          titulo="Histórico de simulados"
          className="w-[370px]"
        >
          <svg
            width="330"
            height="112"
            viewBox="0 0 330 112"
            fill="none"
            className="mt-3"
          >
            <line
              x1="8"
              y1="15"
              x2="322"
              y2="15"
              stroke="var(--primary)"
              strokeWidth="1"
              strokeDasharray="3 4"
              opacity="0.5"
            />
            <polyline
              className="painel-tour__linha"
              points="10,80 87,66 164,69 241,52 318,39"
              stroke="var(--primary)"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="318" cy="39" r="3.5" fill="var(--primary)" />
          </svg>
          <div className="flex w-[330px] justify-between pt-1.5 font-mono text-[9px] text-night-muted/70">
            {["1º", "2º", "3º", "4º", "5º"].map((n) => (
              <span key={n}>{n}</span>
            ))}
          </div>
        </Carta>
      </div>

      {/* Linha B — três números */}
      <div className="painel-tour__3d mt-[18px] flex gap-[18px]">
        {STATS.map((card) => (
          <div
            key={card.r}
            className="painel-tour__carta w-[305px] rounded-xl border border-night-border bg-night-card p-[18px]"
            style={vooStyle(VOOS[card.k])}
          >
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-night-muted">
              {card.r}
            </span>
            {card.n === undefined ? (
              <p
                className={`mt-3 font-display text-[29px] font-semibold tracking-tight ${card.c}`}
              >
                {card.v}
              </p>
            ) : (
              <p
                className={`painel-tour__n mt-3 font-display text-[29px] font-semibold tracking-tight ${card.c}`}
                style={{ "--n-alvo": card.n } as CSSProperties}
                data-sufixo={card.sufixo}
              >
                <span className="sr-only">{card.v}</span>
              </p>
            )}
            <p className="mt-1 text-[11px] text-night-muted">{card.s}</p>
          </div>
        ))}
      </div>

      {/* Linha C — risco + ação */}
      <div className="painel-tour__3d mt-[18px] flex items-start gap-[18px]">
        <Carta voo={VOOS.risco} regiao={2} rotulo="Prioridade" className="w-[562px]">
          <p className="mt-2 text-[17px] font-medium text-night-foreground">
            Disciplinas em risco
          </p>
          <p className="text-xs text-night-muted">
            Onde você mais perde ponto, em ordem
          </p>
          <ul className="mt-4 flex flex-col gap-1">
            {RISCO.map((m, i) => (
              <li
                key={m.nome}
                className={`flex items-center gap-3 ${
                  i < RISCO.length - 1
                    ? "border-b border-night-border/70 pb-[11px]"
                    : ""
                }`}
              >
                <span className="w-[138px] shrink-0 text-[13px] text-night-foreground/85">
                  {m.nome}
                </span>
                <span className="h-1.5 grow rounded-full bg-night-border">
                  <span
                    className={`painel-tour__risco-barra block h-1.5 rounded-full ${corDaBarra(m.tom)}`}
                    style={{ width: `${m.largura}px`, "--i": i } as CSSProperties}
                  />
                </span>
                <span
                  className={`w-[34px] shrink-0 font-mono text-xs ${corDaTaxa(m.tom)}`}
                >
                  {m.taxa === null ? "—" : `${m.taxa}%`}
                </span>
                <span className="flex w-[66px] shrink-0 justify-end">
                  <span
                    className={
                      m.tom === "medindo"
                        ? "rounded border border-night-border px-2 py-0.5 font-mono text-[9px] text-night-muted"
                        : m.tom === "critico"
                          ? "rounded bg-destructive/15 px-2 py-0.5 font-mono text-[9px] text-destructive"
                          : "rounded bg-warning/15 px-2 py-0.5 font-mono text-[9px] text-warning"
                    }
                  >
                    {m.tom === "medindo"
                      ? "medindo"
                      : m.tom === "critico"
                        ? "crítico"
                        : "atenção"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Carta>

        <div className="painel-tour__3d flex w-[370px] flex-col gap-[18px]">
          <Carta
            voo={VOOS.acao}
            regiao={3}
            rotulo="Próxima ação · hoje"
            titulo="Treinar Processo Civil"
          >
            <p className="mt-1 text-xs leading-5 text-night-muted">
              20 questões, cerca de 70% nas suas piores matérias
            </p>
            <span className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
              Começar treino
            </span>
          </Carta>
          <Carta
            voo={VOOS.agenda}
            regiao={3}
            rotulo="Agenda da semana"
            titulo="Simulado na quarta"
          >
            <p className="mt-1 text-xs leading-5 text-night-muted">
              80 questões no padrão FGV, no maior bloco livre da sua semana
            </p>
          </Carta>
        </div>
      </div>

      {/* Linha D — histórico. Existe pra superfície não "acabar" na tela. */}
      <Carta
        voo={VOOS.historico}
        rotulo="Histórico"
        titulo="Últimos simulados"
        className="mt-[18px]"
      >
        <ul className="mt-4 flex flex-col gap-1">
          {HISTORICO.map((s, i) => (
            <li
              key={s.data}
              className={`flex items-center gap-3.5 ${
                i < HISTORICO.length - 1
                  ? "border-b border-night-border/70 pb-[11px]"
                  : ""
              }`}
            >
              <span className="w-[92px] shrink-0 font-mono text-[11px] text-night-muted">
                {s.data}
              </span>
              <span className="grow text-[13px] text-night-foreground/85">
                Simulado completo · {s.exame}
              </span>
              <span className="w-[78px] shrink-0 font-mono text-xs text-night-muted">
                {s.acertos} / 80
              </span>
              <span
                className={`w-12 shrink-0 font-mono text-xs ${
                  s.taxa >= 40 ? "text-warning" : "text-destructive"
                }`}
              >
                {s.taxa}%
              </span>
            </li>
          ))}
        </ul>
      </Carta>
    </div>
  );
}

export function PainelTour() {
  return (
    <section
      className="painel-tour bg-night"
      aria-labelledby="painel-tour-titulo"
    >
      <div className="painel-tour__viewport">
        {/* Palco: a `perspective` mora AQUI, nunca num ancestral da página —
            ancestral com perspective vira bloco contenedor de `position: fixed`
            e tiraria o Header e o botão do WhatsApp do lugar. */}
        <div className="painel-tour__palco" aria-hidden>
          {/* Mesma grade das outras seções escuras (`hero`, `final-cta`,
              `newsletter`, `painel-cronograma`): a classe é a mesma, só a
              máscara muda — aqui deslocada pra 62% porque a composição desta
              seção é pesada à direita.

              Ela mora DENTRO do palco, antes do plano, por dois motivos: fica
              atrás do painel, e recebe o mesmo véu (`__palco::after`) que o
              resto do palco — então acende junto com o dashboard em vez de
              aparecer de chofre. É isso que faz a câmera ler como movimento
              por um espaço, e não como um objeto mudando de tamanho. */}
          <div className="bg-grid-dark absolute inset-0 [mask-image:radial-gradient(ellipse_80%_70%_at_62%_45%,black_20%,transparent_82%)]" />
          <div className="painel-tour__plano">
            {/* Casco da máquina: é o que faz o painel ler como UMA TELA em vez
                de cartões soltos no vazio — e é o que dá à sombra uma borda
                onde se agarrar, sem a qual não existe sensação de flutuar. */}
            <div className="painel-tour__maquina">
              <div className="painel-tour__chrome">
                <span className="painel-tour__pontos">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="painel-tour__url">
                  aprovaoab.app.br/dashboard
                </span>
              </div>
              <div className="painel-tour__tela">
                <Maquete />
              </div>
            </div>
          </div>
        </div>

        {/* Cortina: isola a coluna editorial do painel que passa por trás. */}
        <div className="painel-tour__cortina" aria-hidden />

        <div className="container-page painel-tour__grade">
          <div className="painel-tour__coluna">
            <Eyebrow>O painel</Eyebrow>
            <h2
              id="painel-tour-titulo"
              className="mt-5 font-display text-4xl leading-[1.08] tracking-tight text-night-foreground text-balance sm:text-[2.75rem]"
            >
              Você vê se{" "}
              <em className="italic text-primary">passaria hoje.</em> E o que
              falta.
            </h2>
            <p className="mt-5 max-w-[26rem] text-[15px] leading-relaxed text-night-muted">
              Cada resposta entra na conta. Sua nota de simulado contra a meta
              de 50%, as matérias que mais custam pontos e as que ainda não
              foram medidas — sobre essas, o painel não arrisca nota.
            </p>

            <ul className="painel-tour__lista">
              {PASSOS.map((passo, i) => (
                <li
                  key={passo.titulo}
                  className="painel-tour__item"
                  data-passo={i + 1}
                >
                  <h3 className="text-[15px] font-semibold">{passo.titulo}</h3>
                  <p className="painel-tour__corpo">{passo.corpo}</p>
                </li>
              ))}
            </ul>

            <p className="mt-7 font-mono text-[10px] uppercase tracking-[0.18em] text-night-muted/70">
              Maquete do painel · números ilustrativos
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
