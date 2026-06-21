"use client";

import * as React from "react";
import {
  AnimatePresence,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Battery,
  Brain,
  CalendarDays,
  Check,
  ListChecks,
  Lock,
  RotateCcw,
  Signal,
  Timer,
  Wifi,
  X,
} from "lucide-react";

import { AnimatedNumber } from "@/components/site/animated-number";
import { CtaButton } from "@/components/site/cta-button";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.21, 0.61, 0.35, 1];
const LETTERS = ["A", "B", "C", "D"] as const;

/* =====================================================================
   QUESTÕES DO MINI-DIAGNÓSTICO — exemplos ilustrativos, NÃO são questões
   oficiais de prova. Pra trocar pelas definitivas (banco real, padrão
   FGV), basta editar este array: `correct` é o índice da alternativa
   correta (0 = A) e `barKey` indica qual barra do celular reage.
   ===================================================================== */

export type DiagnosticQuestion = {
  subject: string;
  barKey: "etica" | "constitucional";
  prompt: string;
  options: [string, string, string, string];
  correct: 0 | 1 | 2 | 3;
};

export const DIAGNOSTIC_QUESTIONS: DiagnosticQuestion[] = [
  {
    subject: "Ética Profissional",
    barKey: "etica",
    prompt:
      "Sobre a publicidade na advocacia, conforme o Código de Ética da OAB, é correto afirmar que:",
    options: [
      "É livre, inclusive com promessa de resultado",
      "É permitida com caráter informativo, vedada a mercantilização",
      "É proibida em qualquer hipótese",
      "Só é permitida em rádio e televisão",
    ],
    correct: 1,
  },
  {
    subject: "Direito Constitucional",
    barKey: "constitucional",
    prompt:
      "Segundo a Constituição Federal, o habeas corpus protege a liberdade de:",
    options: ["Expressão", "Reunião", "Locomoção", "Associação"],
    correct: 2,
  },
];

/* Valores-base do dashboard ilustrativo e quanto cada resposta move */
const RING_BASE = 68;
const BAR_BASE = { etica: 84, constitucional: 71, penal: 41 };
const HIT = { etica: 90, constitucional: 78 };
const MISS = { etica: 68, constitucional: 63 };

type Answers = [number | null, number | null];

function isCorrect(answers: Answers, index: number) {
  const a = answers[index];
  return a !== null && a === DIAGNOSTIC_QUESTIONS[index].correct;
}

function barTone(value: number) {
  return value >= 70
    ? "bg-primary"
    : value >= 50
      ? "bg-warning"
      : "bg-destructive";
}

/* ------------------------------------------------------------------ */
/* Painel esquerdo — navegação do simulado (células 1–2 jogáveis)      */
/* ------------------------------------------------------------------ */

function NavCell({
  index,
  state,
  isCurrent,
  reduce,
}: {
  index: number;
  state: "branco" | "correta" | "incorreta";
  isCurrent: boolean;
  reduce: boolean;
}) {
  return (
    <span
      className={cn(
        "relative flex h-6 w-6 items-center justify-center rounded-md font-mono text-[10px] font-medium transition-colors duration-200 sm:h-7 sm:w-7",
        isCurrent
          ? "bg-primary text-white"
          : state === "correta"
            ? "border border-primary/30 bg-primary/15 text-primary-deep"
            : state === "incorreta"
              ? "border border-destructive/30 bg-destructive/10 text-destructive"
              : "border border-border bg-background text-muted-foreground"
      )}
    >
      {isCurrent ? (
        <motion.span
          layoutId="diagnostic-cell"
          aria-hidden
          className="absolute -inset-[3px] rounded-lg border-2 border-primary"
          transition={
            reduce
              ? { duration: 0 }
              : { type: "spring", stiffness: 420, damping: 32 }
          }
        />
      ) : null}
      {index + 1}
    </span>
  );
}

function LegendItem({ swatch, label }: { swatch: string; label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span aria-hidden className={cn("h-2.5 w-2.5 rounded-[4px]", swatch)} />
      <span className="text-[9px] text-muted-foreground">{label}</span>
    </li>
  );
}

function NavPanel({
  step,
  answers,
  reduce,
}: {
  step: number;
  answers: Answers;
  reduce: boolean;
}) {
  const answered = answers.filter((a) => a !== null).length;

  return (
    <div className="hidden border-r border-border bg-muted p-3 sm:block sm:p-4">
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
          Mini-diagnóstico
        </p>
        <p className="font-mono text-[9px] text-muted-foreground">
          2 questões
        </p>
      </div>

      <div className="mt-3 grid grid-cols-5 gap-1 sm:gap-1.5" aria-hidden>
        {Array.from({ length: 20 }).map((_, i) =>
          i < 2 ? (
            <NavCell
              key={i}
              index={i}
              isCurrent={i === step}
              state={
                answers[i as 0 | 1] === null
                  ? "branco"
                  : isCorrect(answers, i)
                    ? "correta"
                    : "incorreta"
              }
              reduce={reduce}
            />
          ) : (
            <span
              key={i}
              className="flex h-6 w-6 items-center justify-center rounded-md border border-dashed border-border bg-background font-mono text-[10px] text-muted-foreground/35 sm:h-7 sm:w-7"
            >
              {i + 1}
            </span>
          )
        )}
      </div>

      <ul className="mt-3.5 grid grid-cols-2 gap-x-2 gap-y-1.5">
        <LegendItem swatch="bg-primary" label="Atual" />
        <LegendItem
          swatch="border border-primary/40 bg-primary/20"
          label="Correta"
        />
        <LegendItem
          swatch="border border-destructive/40 bg-destructive/15"
          label="Incorreta"
        />
        <LegendItem
          swatch="border border-border bg-background"
          label="Em branco"
        />
      </ul>

      <div className="mt-3.5 border-t border-border pt-3">
        <p className="font-mono text-[9px] text-muted-foreground">
          {answered} de 2 respondidas
        </p>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-border">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={false}
            animate={{ width: `${(answered / 2) * 100}%` }}
            transition={reduce ? { duration: 0 } : { duration: 0.4, ease: EASE }}
          />
        </div>
        <p className="mt-3 flex items-center gap-1.5 font-mono text-[8.5px] uppercase tracking-[0.12em] text-muted-foreground/80">
          <Lock className="size-2.5 shrink-0" aria-hidden />
          Simulado completo: 80 questões
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Painel direito — o quiz jogável                                     */
/* ------------------------------------------------------------------ */

function OptionRow({
  letter,
  text,
  tone,
  disabled,
  onClick,
  reduce,
}: {
  letter: string;
  text: string;
  tone: "idle" | "correct" | "wrong" | "dim";
  disabled: boolean;
  onClick: () => void;
  reduce: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex min-h-11 w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors duration-200 sm:min-h-0",
        tone === "idle" &&
          "cursor-pointer border-border bg-background hover:border-primary/50 hover:bg-primary/[0.04]",
        tone === "correct" && "border-primary/50 bg-primary/10",
        tone === "wrong" && "border-destructive/50 bg-destructive/10",
        tone === "dim" && "border-border bg-background opacity-55"
      )}
    >
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold",
          tone === "correct"
            ? "bg-primary text-white"
            : tone === "wrong"
              ? "bg-destructive text-white"
              : "border border-border bg-muted text-muted-foreground"
        )}
      >
        {letter}
      </span>
      <span className="flex-1 text-[10.5px] leading-snug text-foreground sm:text-[11px]">
        {text}
      </span>
      {tone === "correct" ? (
        <motion.span
          initial={reduce ? false : { scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.25, delay: reduce ? 0 : 0.15, ease: EASE }}
        >
          <Check className="size-3.5 shrink-0 text-primary-deep" aria-hidden />
        </motion.span>
      ) : null}
      {tone === "wrong" ? (
        <motion.span
          initial={reduce ? false : { scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2, ease: EASE }}
        >
          <X className="size-3.5 shrink-0 text-destructive" aria-hidden />
        </motion.span>
      ) : null}
    </button>
  );
}

function QuestionView({
  index,
  chosen,
  onAnswer,
  onNext,
  reduce,
}: {
  index: number;
  chosen: number | null;
  onAnswer: (option: number) => void;
  onNext: () => void;
  reduce: boolean;
}) {
  const q = DIAGNOSTIC_QUESTIONS[index];
  const answered = chosen !== null;
  const hit = answered && chosen === q.correct;
  const isLast = index === DIAGNOSTIC_QUESTIONS.length - 1;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-md bg-secondary/10 px-2 py-1 font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-secondary">
          {q.subject}
        </span>
        <span className="rounded-md bg-eyebrow px-2 py-1 font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-eyebrow-foreground">
          Exemplo
        </span>
        <span className="ml-auto font-mono text-[9px] text-muted-foreground">
          Questão {index + 1} de 2
        </span>
      </div>

      <p className="mt-3 text-[11px] font-medium leading-relaxed text-foreground sm:text-xs">
        {q.prompt}
      </p>

      <div className="mt-3 space-y-2">
        {q.options.map((option, i) => (
          <OptionRow
            key={option}
            letter={LETTERS[i]}
            text={option}
            disabled={answered}
            onClick={() => onAnswer(i)}
            reduce={reduce}
            tone={
              !answered
                ? "idle"
                : i === q.correct
                  ? "correct"
                  : i === chosen
                    ? "wrong"
                    : "dim"
            }
          />
        ))}
      </div>

      <div className="mt-3 min-h-7">
        <AnimatePresence>
          {answered ? (
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="flex flex-wrap items-center gap-2"
            >
              <p
                role="status"
                className={cn(
                  "rounded-md px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em]",
                  hit
                    ? "bg-primary/10 text-primary-deep"
                    : "bg-destructive/10 text-destructive"
                )}
              >
                {hit ? "Boa!" : `Quase — a correta é a ${LETTERS[q.correct]}.`}
              </p>
              <button
                type="button"
                onClick={onNext}
                className="flex cursor-pointer items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 font-mono text-[10px] font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary-deep hover:text-white"
              >
                {isLast ? "Ver resultado" : "Próxima"}
                <ArrowRight className="size-3" aria-hidden />
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ResultView({
  answers,
  onRestart,
}: {
  answers: Answers;
  onRestart: () => void;
}) {
  const score = DIAGNOSTIC_QUESTIONS.filter((_, i) =>
    isCorrect(answers, i)
  ).length;
  const wrong = DIAGNOSTIC_QUESTIONS.filter((_, i) => !isCorrect(answers, i));

  return (
    <div>
      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
        Mini-diagnóstico concluído
      </p>
      <p className="mt-2 font-display text-xl tracking-tight text-foreground">
        Você acertou {score} de 2
      </p>

      <ul className="mt-3 space-y-1.5">
        {DIAGNOSTIC_QUESTIONS.map((q, i) => {
          const hit = isCorrect(answers, i);
          return (
            <li key={q.subject} className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full",
                  hit
                    ? "bg-primary/15 text-primary-deep"
                    : "bg-destructive/10 text-destructive"
                )}
              >
                {hit ? (
                  <Check className="size-3" aria-hidden />
                ) : (
                  <X className="size-3" aria-hidden />
                )}
              </span>
              <span className="text-[11px] text-foreground">{q.subject}</span>
              {!hit ? (
                <span className="rounded bg-destructive/10 px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.12em] text-destructive">
                  vira prioridade
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-[10.5px] leading-relaxed text-muted-foreground">
        {wrong.length > 0
          ? `No diagnóstico completo, ${wrong[0].subject} entraria como prioridade do seu plano — é assim que o AprovaOAB monta o treino pelos seus erros.`
          : "Você gabaritou os exemplos. No diagnóstico completo, o algoritmo encontra seus pontos fracos reais — e monta o plano em cima deles."}
      </p>

      <div className="mt-4 space-y-2">
        <CtaButton
          size="sm"
          className="w-full"
          label="Criar conta grátis e ver o plano completo"
        />
        <button
          type="button"
          onClick={onRestart}
          className="mx-auto flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[10px] text-muted-foreground transition-colors duration-200 hover:text-foreground"
        >
          <RotateCcw className="size-3" aria-hidden />
          Refazer
        </button>
      </div>
    </div>
  );
}

function QuizPanel({
  step,
  answers,
  onAnswer,
  onNext,
  onRestart,
  reduce,
}: {
  step: number;
  answers: Answers;
  onAnswer: (option: number) => void;
  onNext: () => void;
  onRestart: () => void;
  reduce: boolean;
}) {
  return (
    <div className="flex min-h-[290px] flex-col bg-background p-4 sm:p-5">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={reduce ? false : { opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, x: -12 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          {step < 2 ? (
            <QuestionView
              index={step}
              chosen={answers[step as 0 | 1]}
              onAnswer={onAnswer}
              onNext={onNext}
              reduce={reduce}
            />
          ) : (
            <ResultView answers={answers} onRestart={onRestart} />
          )}
        </motion.div>
      </AnimatePresence>

      <p className="mt-auto pt-3 font-mono text-[8.5px] uppercase tracking-[0.12em] text-muted-foreground/80">
        Exemplo ilustrativo — questões reais seguem o padrão FGV
      </p>
    </div>
  );
}

function Notebook({
  step,
  answers,
  onAnswer,
  onNext,
  onRestart,
  reduce,
}: {
  step: number;
  answers: Answers;
  onAnswer: (option: number) => void;
  onNext: () => void;
  onRestart: () => void;
  reduce: boolean;
}) {
  return (
    <div className="relative">
      {/* Janela do navegador */}
      <div className="overflow-hidden rounded-xl border border-night-border bg-night-card shadow-[0_50px_100px_-30px_rgba(2,6,23,0.85)] ring-1 ring-white/5">
        {/* Barra do navegador */}
        <div className="flex items-center justify-between gap-3 border-b border-night-border px-3.5 py-2.5">
          <div className="flex items-center gap-1.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-primary/70" />
          </div>
          <div className="flex items-center gap-1.5 rounded-md border border-night-border bg-night px-3 py-1 font-mono text-[10px] text-night-muted">
            <Lock className="size-2.5 text-primary" aria-hidden />
            aprovaoab.app.br/diagnostico
          </div>
          <span className="w-[42px]" aria-hidden />
        </div>

        {/* App em modo claro: navegação + quiz */}
        <div className="grid grid-cols-1 sm:grid-cols-[176px_1fr]">
          <NavPanel step={step} answers={answers} reduce={reduce} />
          <QuizPanel
            step={step}
            answers={answers}
            onAnswer={onAnswer}
            onNext={onNext}
            onRestart={onRestart}
            reduce={reduce}
          />
        </div>
      </div>

      {/* Base do notebook */}
      <div aria-hidden className="relative mx-[-5%] mt-px">
        <div className="h-3.5 rounded-b-2xl rounded-t-sm border border-night-border bg-gradient-to-b from-night-border to-night" />
        <div className="absolute left-1/2 top-0 h-1.5 w-20 -translate-x-1/2 rounded-b-lg bg-night" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Celular — dashboard que reage às respostas do mini-diagnóstico      */
/* ------------------------------------------------------------------ */

const FEATURES = [
  { label: "Questões", icon: ListChecks },
  { label: "Simulados", icon: Timer },
  { label: "Treino inteligente", icon: Brain },
  { label: "Agenda", icon: CalendarDays },
  { label: "Desempenho", icon: BarChart3 },
  { label: "Diagnóstico", icon: Activity },
];

const RING_RADIUS = 40;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

type PhoneState = {
  ring: number;
  bars: { name: string; value: number }[];
  focus: string | null;
  started: boolean;
};

function Phone({ reduce, state }: { reduce: boolean; state: PhoneState }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <div
      ref={ref}
      className="rounded-[2.1rem] border border-night-border bg-night p-2 shadow-[0_45px_90px_-25px_rgba(2,6,23,0.9)] ring-1 ring-white/10"
    >
      <div className="overflow-hidden rounded-[1.6rem] border border-night-border bg-night">
        {/* Barra de status */}
        <div className="relative flex items-center justify-between px-4 pb-1 pt-2.5">
          <span className="font-mono text-[8px] text-night-muted">9:41</span>
          <span
            aria-hidden
            className="absolute left-1/2 top-2 h-3 w-14 -translate-x-1/2 rounded-full bg-black/70"
          />
          <span className="flex items-center gap-1 text-night-muted" aria-hidden>
            <Signal className="size-2.5" />
            <Wifi className="size-2.5" />
            <Battery className="size-3" />
          </span>
        </div>

        <div className="space-y-2 p-2.5">
          {/* Anel de aproveitamento */}
          <div className="flex items-center gap-2.5 rounded-xl border border-night-border bg-night-card p-2.5">
            <div className="relative grid h-16 w-16 shrink-0 place-items-center">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle
                  cx="50"
                  cy="50"
                  r={RING_RADIUS}
                  fill="none"
                  stroke="var(--night-border)"
                  strokeWidth="11"
                />
                <motion.circle
                  cx="50"
                  cy="50"
                  r={RING_RADIUS}
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="11"
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  initial={{ strokeDashoffset: RING_CIRCUMFERENCE }}
                  animate={
                    inView
                      ? {
                          strokeDashoffset:
                            RING_CIRCUMFERENCE * (1 - state.ring / 100),
                        }
                      : undefined
                  }
                  transition={
                    reduce
                      ? { duration: 0 }
                      : { duration: 0.9, ease: "easeOut" }
                  }
                />
              </svg>
              <p className="absolute text-sm font-semibold tabular-nums text-night-foreground">
                <AnimatedNumber value={state.ring} active={inView} duration={0.9} />
                <span className="text-[8px] text-night-muted">%</span>
              </p>
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[7.5px] uppercase tracking-[0.16em] text-night-muted">
                {state.started ? "Seu mini-diagnóstico" : "Seu progresso"}
              </p>
              <p className="text-[11px] font-semibold leading-tight text-night-foreground">
                Rumo à aprovação
              </p>
              <p className="mt-0.5 text-[8px] leading-snug text-night-muted">
                Aproveitamento geral
              </p>
            </div>
          </div>

          {/* Funções do produto */}
          <div className="grid grid-cols-3 gap-1">
            {FEATURES.map(({ label, icon: Icon }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-0.5 rounded-lg border border-night-border bg-night-card px-0.5 py-1.5 text-center"
              >
                <Icon className="size-3 text-primary" aria-hidden />
                <span className="text-[7.5px] leading-tight text-night-muted">
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Aproveitamento por matéria — reage ao quiz */}
          <div className="space-y-1.5 rounded-xl border border-night-border bg-night-card p-2.5">
            {state.bars.map((bar) => (
              <div key={bar.name}>
                <div className="flex items-baseline justify-between">
                  <span className="text-[8.5px] text-night-muted">
                    {bar.name}
                  </span>
                  <span className="font-mono text-[8px] tabular-nums text-night-muted">
                    <AnimatedNumber
                      value={bar.value}
                      active={inView}
                      duration={0.7}
                      suffix="%"
                    />
                  </span>
                </div>
                <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-night-border">
                  <motion.div
                    className={cn(
                      "h-full rounded-full transition-colors duration-300",
                      barTone(bar.value)
                    )}
                    initial={{ width: 0 }}
                    animate={inView ? { width: `${bar.value}%` } : undefined}
                    transition={
                      reduce
                        ? { duration: 0 }
                        : { duration: 0.7, ease: EASE }
                    }
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Treino do dia — reflete o erro do visitante */}
          <div className="rounded-xl border border-primary/30 bg-primary/10 px-2.5 py-2">
            <p className="font-mono text-[7.5px] uppercase tracking-[0.16em] text-primary">
              Treino de hoje
            </p>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={state.focus ?? "default"}
                initial={reduce ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: EASE }}
              >
                <p className="mt-0.5 text-[10px] font-medium leading-tight text-night-foreground">
                  {state.focus
                    ? `${state.focus} · prioridade`
                    : "Direito Penal · 20 questões"}
                </p>
                <p className="text-[8px] text-night-muted">
                  {state.focus
                    ? "Ajustado pelo seu mini-diagnóstico"
                    : "Priorizado pelos seus erros recentes"}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Cluster — tilt 3D sutil + flutuação + estado do mini-diagnóstico    */
/* ------------------------------------------------------------------ */

export function DeviceCluster() {
  const reduce = useReducedMotion() ?? false;

  const [step, setStep] = React.useState(0);
  const [answers, setAnswers] = React.useState<Answers>([null, null]);

  const handleAnswer = (option: number) => {
    if (step > 1 || answers[step as 0 | 1] !== null) return;
    setAnswers((prev) => {
      const next: Answers = [...prev];
      next[step as 0 | 1] = option;
      return next;
    });
  };
  const handleNext = () => setStep((s) => Math.min(2, s + 1));
  const handleRestart = () => {
    setAnswers([null, null]);
    setStep(0);
  };

  /* Estado do celular derivado das respostas */
  const phoneState = React.useMemo<PhoneState>(() => {
    const etica =
      answers[0] === null
        ? BAR_BASE.etica
        : isCorrect(answers, 0)
          ? HIT.etica
          : MISS.etica;
    const constitucional =
      answers[1] === null
        ? BAR_BASE.constitucional
        : isCorrect(answers, 1)
          ? HIT.constitucional
          : MISS.constitucional;
    const ring =
      RING_BASE +
      (answers[0] === null ? 0 : isCorrect(answers, 0) ? 3 : -4) +
      (answers[1] === null ? 0 : isCorrect(answers, 1) ? 3 : -4);
    const wrongSubjects = DIAGNOSTIC_QUESTIONS.filter(
      (_, i) => answers[i] !== null && !isCorrect(answers, i)
    ).map((q) => q.subject);
    return {
      ring,
      bars: [
        { name: "Ética", value: etica },
        { name: "Constitucional", value: constitucional },
        { name: "Penal", value: BAR_BASE.penal },
      ],
      focus: wrongSubjects[0] ?? null,
      started: answers.some((a) => a !== null),
    };
  }, [answers]);

  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(my, [0, 1], [3, -3]), {
    stiffness: 180,
    damping: 26,
  });
  const rotateY = useSpring(useTransform(mx, [0, 1], [-4.5, 4.5]), {
    stiffness: 180,
    damping: 26,
  });

  function handleMove(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    mx.set((event.clientX - rect.left) / rect.width);
    my.set((event.clientY - rect.top) / rect.height);
  }

  function handleLeave() {
    mx.set(0.5);
    my.set(0.5);
  }

  return (
    <div
      className="relative"
      style={{ perspective: 1400 }}
      onMouseMove={reduce ? undefined : handleMove}
      onMouseLeave={reduce ? undefined : handleLeave}
    >
      {/* Brilhos de fundo */}
      <div aria-hidden className="absolute -inset-10 -z-10">
        <div className="absolute left-1/4 top-0 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-secondary-bright/15 blur-3xl" />
      </div>

      <motion.div
        style={
          reduce ? undefined : { rotateX, rotateY, transformStyle: "preserve-3d" }
        }
        // Above-the-fold: visível na primeira pintura (sem fade-in de entrada).
        // O tilt 3D e a flutuação contínua abaixo permanecem.
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: EASE }}
      >
        <motion.div
          animate={reduce ? undefined : { y: [0, -9, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        >
          <Notebook
            step={step}
            answers={answers}
            onAnswer={handleAnswer}
            onNext={handleNext}
            onRestart={handleRestart}
            reduce={reduce}
          />
        </motion.div>

        <motion.div
          className="pointer-events-none relative z-20 mx-auto mt-7 w-44 sm:absolute sm:-bottom-10 sm:-right-2 sm:mx-0 sm:mt-0 sm:w-48 sm:rotate-6 lg:-right-6"
          style={reduce ? undefined : { z: 60 }}
          // Above-the-fold: visível na primeira pintura (sem fade-in de entrada).
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: EASE }}
        >
          <motion.div
            animate={reduce ? undefined : { y: [0, -7, 0] }}
            transition={{
              duration: 7,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5,
            }}
          >
            <Phone reduce={reduce} state={phoneState} />
          </motion.div>
        </motion.div>
      </motion.div>

      <p className="mt-7 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-night-muted/70 sm:mt-16 lg:mt-20 lg:text-left">
        Demo interativa — dados ilustrativos · questões reais no padrão FGV
      </p>
    </div>
  );
}
