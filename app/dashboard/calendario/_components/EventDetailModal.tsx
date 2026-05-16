"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import Link from "next/link"
import { Badge }    from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import {
  BookOpen, FileText, RotateCcw, Trophy,
  Clock, Target, Sparkles, CalendarDays, ArrowRight,
} from "lucide-react"

// ─────────────────────────────────────────────────────────────────────────────
// Types & helpers shared with the rest of the calendar
// ─────────────────────────────────────────────────────────────────────────────
export interface CalendarEvent {
  id:      string
  title:   string
  type:    "study" | "simulado" | "revisao" | "prova"
  date:    string   // YYYY-MM-DD
  time:    string   // HH:MM
  is_auto: boolean
  subject: string | null
  reason:  string | null
}

export const EVENT_DURATION_MIN: Record<string, number> = {
  study:    90,
  revisao:  60,
  simulado: 240,
  prova:    180,
}

export const RECOMMENDED_QUESTIONS: Record<string, number> = {
  study:    20,
  revisao:  10,
  simulado: 80,
  prova:    80,
}

export const TYPE_CONFIG = {
  study:    { label: "Treino",   icon: BookOpen,  color: "text-primary",     border: "border-primary/30",     bg: "bg-primary/10" },
  simulado: { label: "Simulado", icon: FileText,  color: "text-blue-500",    border: "border-blue-500/30",    bg: "bg-blue-500/10" },
  revisao:  { label: "Revisão",  icon: RotateCcw, color: "text-yellow-500",  border: "border-yellow-500/30",  bg: "bg-yellow-500/10" },
  prova:    { label: "Prova",    icon: Trophy,    color: "text-destructive",  border: "border-destructive/30", bg: "bg-destructive/10" },
} as const

/** Extrai % de acerto do campo `reason` (ex: "…32% de acerto…" → 32) */
export function parsePerformancePct(reason: string | null): number | null {
  if (!reason) return null
  const m = reason.match(/(\d+)%\s*de\s*acerto/)
  return m ? parseInt(m[1]) : null
}

/** Cor/label baseados na taxa de acerto */
export function perfStyle(pct: number | null) {
  if (pct === null)  return { color: "text-blue-500",   border: "border-l-blue-500",   label: null,            barColor: "bg-blue-500" }
  if (pct < 40)      return { color: "text-destructive", border: "border-l-destructive", label: "Crítico",       barColor: "bg-destructive" }
  if (pct <= 70)     return { color: "text-yellow-500",  border: "border-l-yellow-500",  label: "Intermediário", barColor: "bg-yellow-500" }
  return               { color: "text-primary",          border: "border-l-primary",     label: "Bom",           barColor: "bg-primary" }
}

// ─────────────────────────────────────────────────────────────────────────────
const WEEKDAYS_PT = ["domingo","segunda-feira","terça-feira","quarta-feira","quinta-feira","sexta-feira","sábado"]
const MONTHS_PT   = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"]

/** Formata uma Date como YYYY-MM-DD no fuso LOCAL (não usa toISOString → não vaza p/ UTC). */
export function fmtLocalDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function fmtDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number)
  const dt = new Date(y, m - 1, d)
  return `${WEEKDAYS_PT[dt.getDay()]}, ${d} de ${MONTHS_PT[m - 1]} de ${y}`
}

// ─────────────────────────────────────────────────────────────────────────────
export function EventDetailModal({
  event,
  open,
  onClose,
}: {
  event:   CalendarEvent | null
  open:    boolean
  onClose: () => void
}) {
  if (!event) return null

  const cfg     = TYPE_CONFIG[event.type] ?? TYPE_CONFIG.study
  const Icon    = cfg.icon
  const pct     = parsePerformancePct(event.reason)
  const perf    = perfStyle(pct)
  const recQtd  = RECOMMENDED_QUESTIONS[event.type] ?? 20
  const dur     = EVENT_DURATION_MIN[event.type] ?? 60

  const isSimulado = event.type === "simulado" || event.type === "prova"
  const ctaHref    = isSimulado ? "/dashboard/simulados" : "/dashboard/treino"
  const ctaLabel   = isSimulado ? "Ir para o simulado" : "Ir para o treino"

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md gap-0 p-0 overflow-hidden">

        {/* ── Colored top strip ──────────────────────────── */}
        <div className={`h-1.5 w-full ${perf.barColor}`} />

        <div className="p-5 space-y-4">
          <DialogHeader className="space-y-1">
            <div className="flex items-start gap-2">
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${cfg.color}`} />
              <DialogTitle className="text-base leading-snug text-foreground">
                {event.title}
              </DialogTitle>
            </div>
          </DialogHeader>

          {/* ── Meta row ──────────────────────────────────── */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={`text-[11px] ${cfg.color} ${cfg.border} ${cfg.bg}`}>
              <Icon className="mr-1 h-3 w-3" />{cfg.label}
            </Badge>
            <Badge variant="outline" className="text-[11px] text-muted-foreground">
              <Clock className="mr-1 h-3 w-3" />
              {event.time.slice(0, 5)} · {dur} min
            </Badge>
            {event.is_auto && (
              <Badge variant="outline"
                className="text-[11px] border-[#b8860b]/30 bg-[#b8860b]/10 text-[#b8860b]">
                <Sparkles className="mr-1 h-3 w-3" />Gerado por IA
              </Badge>
            )}
          </div>

          {/* ── Date ──────────────────────────────────────── */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground capitalize">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            {fmtDate(event.date)}
          </div>

          <Separator />

          {/* ── Performance ───────────────────────────────── */}
          {pct !== null ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Taxa de acerto atual</span>
                <div className="flex items-center gap-1.5">
                  <span className={`text-base font-black ${perf.color}`}
                    style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                    {pct}%
                  </span>
                  {perf.label && (
                    <span className={`text-[10px] font-medium uppercase tracking-wide ${perf.color}`}>
                      · {perf.label}
                    </span>
                  )}
                </div>
              </div>
              {/* Progress bar */}
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all ${perf.barColor}`}
                  style={{ width: `${pct}%` }}
                />
                {/* 60% target line */}
                <div className="absolute top-0 bottom-0 w-px bg-foreground/30"
                  style={{ left: "60%" }} title="Meta: 60%" />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Meta mínima para aprovação: <strong className="text-foreground">60%</strong>
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className={`h-2 w-2 rounded-full ${perf.barColor}`} />
              {event.type === "simulado"
                ? "Simulado completo — avalia todas as matérias."
                : "Evento de revisão geral sem matéria específica."}
            </div>
          )}

          {/* ── Recommended questions ─────────────────────── */}
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
            <Target className="h-4 w-4 text-primary shrink-0" />
            <div>
              <p className="text-[11px] text-muted-foreground">Questões recomendadas</p>
              <p className="text-sm font-semibold text-foreground">{recQtd} questões</p>
            </div>
          </div>

          {/* ── Reason ────────────────────────────────────── */}
          {event.reason && (
            <p className="text-xs text-muted-foreground leading-relaxed border-t border-border pt-3">
              {event.reason}
            </p>
          )}

          {/* ── CTA ───────────────────────────────────────── */}
          <Button asChild className="w-full gap-2">
            <Link href={ctaHref} onClick={onClose}>
              {ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
