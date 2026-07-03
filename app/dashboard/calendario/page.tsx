"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge }  from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sparkles, BookOpen, FileText, RotateCcw, Trophy,
  ChevronLeft, ChevronRight, ChevronDown, Loader2, CalendarDays,
  Brain, AlertTriangle, Clock, Settings2, Info, CalendarCheck2, CalendarPlus,
} from "lucide-react"
import { toast } from "sonner"

import { StatsHeader }                       from "./_components/StatsHeader"
import { CalendarGrid }                      from "./_components/CalendarGrid"
import { EventDetailModal }                  from "./_components/EventDetailModal"
import { AvailabilityPanel }                 from "./_components/AvailabilityPanel"
import { fmtLocalDate }                      from "./_components/EventDetailModal"
import type { CalendarEvent }                from "./_components/EventDetailModal"
import type { DayAvailability, SimuladoPref } from "./_components/AvailabilityPanel"

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const MONTHS_PT      = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"]
const WEEKDAYS_SHORT = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"]
const WEEKDAYS_LONG  = ["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"]

const DEFAULT_AVAIL: DayAvailability = {
  enabled: false,
  slots:   [{ start_time: "19:00", end_time: "22:00" }],
}

const TYPE_CONFIG = {
  study:    { label: "Treino",   icon: BookOpen,  dot: "bg-primary",    borderL: "border-l-primary",    badge: "bg-primary/15 text-primary border-primary/25" },
  simulado: { label: "Simulado", icon: FileText,  dot: "bg-blue-500",   borderL: "border-l-blue-500",   badge: "bg-blue-500/15 text-blue-500 border-blue-500/25" },
  revisao:  { label: "Revisão",  icon: RotateCcw, dot: "bg-yellow-500", borderL: "border-l-yellow-500", badge: "bg-yellow-500/15 text-yellow-500 border-yellow-500/25" },
  prova:    { label: "Prova",    icon: Trophy,    dot: "bg-destructive", borderL: "border-l-destructive",badge: "bg-destructive/15 text-destructive border-destructive/25" },
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Date helpers
// ─────────────────────────────────────────────────────────────────────────────
function parseDateStr(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number)
  return { y, m, d, date: new Date(y, m - 1, d) }
}

function addDays(dateStr: string, days: number): string {
  const { y, m, d } = parseDateStr(dateStr)
  return fmtLocalDate(new Date(y, m - 1, d + days))
}

function todayStr(): string {
  return fmtLocalDate(new Date())
}

function getMondayOf(d: Date): Date {
  const dow  = d.getDay()
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  copy.setDate(copy.getDate() + (dow === 0 ? -6 : 1 - dow))
  return copy
}

function weekStartFor(offsetWeeks: number): string {
  const d   = new Date()
  const dow = d.getDay()                       // 0=Dom … 6=Sáb
  const toMonday = dow === 0 ? -6 : 1 - dow   // quantos dias voltar até segunda
  d.setDate(d.getDate() + toMonday + offsetWeeks * 7)
  return fmtLocalDate(d)
}

// ─────────────────────────────────────────────────────────────────────────────
// Mobile list view
// ─────────────────────────────────────────────────────────────────────────────
function MobileList({
  weekDays,
  eventsByDate,
  today,
  onEventClick,
}: {
  weekDays:     string[]
  eventsByDate: Record<string, CalendarEvent[]>
  today:        string
  onEventClick: (e: CalendarEvent) => void
}) {
  return (
    <div className="md:hidden space-y-5">
      {weekDays.map((dateStr) => {
        const { d, m, date } = parseDateStr(dateStr)
        const dow  = date.getDay()
        const isT  = dateStr === today
        const evts = eventsByDate[dateStr] ?? []

        return (
          <div key={dateStr} className="space-y-2">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg
                ${isT ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                <span className="text-[10px] font-semibold uppercase leading-none">
                  {WEEKDAYS_SHORT[dow]}
                </span>
                <span className="text-base font-black leading-none">{d}</span>
              </div>
              <span className={`text-sm font-semibold ${isT ? "text-primary" : "text-foreground"}`}>
                {isT ? "Hoje" : WEEKDAYS_LONG[dow]}
                <span className="ml-1.5 text-xs font-normal text-muted-foreground capitalize">
                  {d} {MONTHS_PT[m - 1]}
                </span>
              </span>
            </div>

            {evts.length === 0 ? (
              <p className="pl-14 text-xs text-muted-foreground italic">Sem eventos</p>
            ) : (
              <div className="pl-14 space-y-2">
                {evts.map((e) => {
                  const cfg  = TYPE_CONFIG[e.type] ?? TYPE_CONFIG.study
                  const Icon = cfg.icon
                  const now  = new Date()
                  const todayStr = fmtLocalDate(now)
                  const [eh, em] = e.time.split(":").map(Number)
                  const isPast = e.date < todayStr || (
                    e.date === todayStr && (eh * 60 + em) < now.getHours() * 60 + now.getMinutes()
                  )
                  return (
                    <button
                      key={e.id}
                      onClick={() => onEventClick(e)}
                      className={`w-full text-left flex gap-3 rounded-lg border border-l-4
                        bg-card hover:bg-muted/40 transition-colors p-3 ${cfg.borderL}
                        ${isPast ? "opacity-50" : ""}`}
                    >
                      <div className="flex w-12 shrink-0 flex-col items-center">
                        <span className="font-mono text-xs text-muted-foreground">
                          {e.time.slice(0, 5)}
                        </span>
                        <div className={`mt-1 h-2 w-2 rounded-full ${cfg.dot}`} />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-start gap-1.5">
                          <span className="text-sm font-semibold text-foreground leading-tight">
                            {e.title}
                          </span>
                          <Badge variant="outline" className={`text-[10px] border ${cfg.badge}`}>
                            <Icon className="mr-1 h-2.5 w-2.5" />{cfg.label}
                          </Badge>
                          {e.is_auto && (
                            <Badge variant="outline"
                              className="text-[10px] border border-[#b8860b]/30 bg-[#b8860b]/10 text-[#b8860b]">
                              <Sparkles className="mr-1 h-2.5 w-2.5" />IA
                            </Badge>
                          )}
                        </div>
                        {e.reason && (
                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                            {e.reason}
                          </p>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function CalendarioPage() {
  const [events,         setEvents]         = useState<CalendarEvent[]>([])
  const [loading,        setLoading]        = useState(true)
  const [generating,     setGenerating]     = useState(false)
  const [weekOffset,     setWeekOffset]     = useState(0)
  const [showAvailPanel, setShowAvailPanel] = useState(false)
  const [selectedEvent,  setSelectedEvent]  = useState<CalendarEvent | null>(null)
  const [availByDay,     setAvailByDay]     = useState<DayAvailability[]>(
    Array.from({ length: 7 }, () => ({ ...DEFAULT_AVAIL, slots: [{ start_time: "19:00", end_time: "22:00" }] }))
  )
  const [lastGenerated,  setLastGenerated]  = useState<string | null>(null)
  const [showRules,      setShowRules]      = useState(false)
  const [googleConnected, setGoogleConnected] = useState(false)
  const [simuladoPref,   setSimuladoPref]   = useState<SimuladoPref>("weekend")

  const today     = todayStr()
  const weekStart = weekStartFor(weekOffset)
  const weekEnd   = addDays(weekStart, 6)
  const weekDays  = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const { d: sd, m: sm, y: sy } = parseDateStr(weekStart)
  const { d: ed, m: em }        = parseDateStr(weekEnd)
  const weekLabel = `${sd} ${MONTHS_PT[sm - 1]} — ${ed} ${MONTHS_PT[em - 1]} ${sy}`

  // ── Load Google Calendar status ───────────────────────────────
  const loadGoogleStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/google-calendar/status")
      const { connected } = await res.json()
      setGoogleConnected(connected)
    } catch { /* silently ignore */ }
  }, [])

  // ── Load availability ──────────────────────────────────────────
  const loadAvailability = useCallback(async () => {
    try {
      const res = await fetch("/api/calendario/disponibilidade")
      if (!res.ok) return
      const { availability, simulado_preference } = await res.json()

      if (simulado_preference === "weekday" || simulado_preference === "weekend") {
        setSimuladoPref(simulado_preference)
      }

      // Group rows by day_of_week (multiple slots per day supported)
      const next: DayAvailability[] = Array.from({ length: 7 }, () => ({
        enabled: false,
        slots:   [{ start_time: "19:00", end_time: "22:00" }],
      }))

      for (const a of availability ?? []) {
        const slot = {
          start_time: String(a.start_time).slice(0, 5),
          end_time:   String(a.end_time).slice(0, 5),
        }
        if (!next[a.day_of_week].enabled) {
          next[a.day_of_week] = { enabled: true, slots: [slot] }
        } else {
          next[a.day_of_week].slots.push(slot)
        }
      }

      setAvailByDay(next)

      // Auto-open the panel on first visit when no availability is configured yet
      const hasAny = (availability ?? []).length > 0
      if (!hasAny) setShowAvailPanel(true)
    } catch { /* silently ignore */ }
  }, [])

  // ── Load events ───────────────────────────────────────────────
  const loadEvents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/calendario?start=${weekStart}&end=${weekEnd}`)
      if (!res.ok) throw new Error()
      const { events: data } = await res.json()
      setEvents(data ?? [])
    } catch {
      toast.error("Não foi possível carregar a agenda.")
    } finally {
      setLoading(false)
    }
  }, [weekStart, weekEnd])

  useEffect(() => { loadAvailability() }, [loadAvailability])
  useEffect(() => { loadEvents() },       [loadEvents])
  useEffect(() => { loadGoogleStatus() }, [loadGoogleStatus])
  useEffect(() => {
    const saved = localStorage.getItem("agenda_last_generated")
    if (saved) setLastGenerated(saved)
  }, [])
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("google") === "success") {
      toast.success("Google Calendar conectado! Gere um plano para sincronizar.")
      setGoogleConnected(true)
      window.history.replaceState({}, "", window.location.pathname)
    } else if (params.get("google") === "error") {
      toast.error("Não foi possível conectar ao Google Calendar.")
      window.history.replaceState({}, "", window.location.pathname)
    }
  }, [])

  // ── Disconnect Google Calendar ────────────────────────────────
  async function handleDisconnectGoogle() {
    await fetch("/api/google-calendar/disconnect", { method: "DELETE" })
    setGoogleConnected(false)
    toast.success("Google Calendar desconectado.")
  }

  // ── Generate plan ─────────────────────────────────────────────
  async function handleGerar() {
    setGenerating(true)
    try {
      const res = await fetch("/api/calendario/gerar", { method: "POST" })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? "Erro")
      }
      const { count, stats, googleSynced } = await res.json()
      toast.success(
        `Plano gerado! ${count} eventos — ${stats.criticas} matéria(s) crítica(s) priorizadas.${googleSynced ? " Sincronizado com Google Calendar." : ""}`
      )
      const ts = new Date().toISOString()
      localStorage.setItem("agenda_last_generated", ts)
      setLastGenerated(ts)
      setWeekOffset(0)
      await loadEvents()
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao gerar plano.")
    } finally {
      setGenerating(false)
    }
  }

  // ── Save availability + generate (called from AvailabilityPanel) ──
  async function handleSaveAndGenerate(avail: DayAvailability[], pref: SimuladoPref) {
    // Flatten to array of rows (multiple rows per day allowed)
    const payload = avail.flatMap((d, i) =>
      d.enabled
        ? d.slots.map((s) => ({ day_of_week: i, start_time: s.start_time, end_time: s.end_time }))
        : []
    )

    const saveRes = await fetch("/api/calendario/disponibilidade", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ availability: payload, simulado_preference: pref }),
    })

    if (!saveRes.ok) {
      toast.error("Erro ao salvar horários.")
      return
    }

    setAvailByDay(avail)
    setSimuladoPref(pref)
    setShowAvailPanel(false)

    // Generate plan immediately after saving
    await handleGerar()
  }

  // ── Group events by date ──────────────────────────────────────
  const eventsByDate = weekDays.reduce<Record<string, CalendarEvent[]>>((acc, d) => {
    acc[d] = events
      .filter((e) => e.date === d)
      .sort((a, b) => a.time.localeCompare(b.time))
    return acc
  }, {})

  const totalEvents = events.length
  const hasAvailSet = availByDay.some((a) => a.enabled)

  const daysAgo   = lastGenerated
    ? Math.floor((Date.now() - new Date(lastGenerated).getTime()) / 86_400_000)
    : null
  const isNewWeek = lastGenerated
    ? getMondayOf(new Date()) > getMondayOf(new Date(lastGenerated))
    : false
  const showNudge = (isNewWeek || (daysAgo !== null && daysAgo >= 7))
    && hasAvailSet && weekOffset === 0

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 lg:p-6">

      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h1 className="font-display text-2xl font-black text-foreground">
              Agenda Inteligente
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Plano gerado automaticamente com base no seu desempenho por disciplina
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {googleConnected ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-green-500/40 text-green-600 hover:text-green-700 dark:text-green-400"
              onClick={handleDisconnectGoogle}
            >
              <CalendarCheck2 className="h-4 w-4" />
              Google Calendar
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => { window.location.href = "/api/google-calendar/auth" }}
            >
              <CalendarPlus className="h-4 w-4" />
              Conectar Google
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setShowAvailPanel((v) => !v)}
          >
            <Settings2 className="h-4 w-4" />
            {hasAvailSet ? "Editar horários" : "Configurar horários"}
          </Button>
          {/* Only show "Gerar Plano" standalone when availability already exists */}
          {hasAvailSet && !showAvailPanel && (
            <Button
              size="sm"
              onClick={handleGerar}
              disabled={generating || loading}
              className="gap-1.5"
            >
              {generating
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Sparkles className="h-4 w-4" />}
              {generating ? "Gerando..." : "Gerar Plano"}
            </Button>
          )}
        </div>
      </div>

      {/* ── Stats header ──────────────────────────────────── */}
      <StatsHeader />

      {/* ── Outdated plan nudge ───────────────────────────── */}
      {showNudge && !showAvailPanel && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <RotateCcw className="h-4 w-4 shrink-0 text-amber-500" />
          <p className="flex-1 text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Hora de atualizar seu plano</strong>
            {" "}— gerado há{" "}
            <strong className="text-foreground">
              {daysAgo} dia{daysAgo !== 1 ? "s" : ""}
            </strong>.
            {" "}Seu desempenho mudou? Regenere para refletir a semana atual.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={handleGerar}
            disabled={generating}
            className="shrink-0 gap-1.5 border-amber-500/30 bg-amber-500/10
              text-amber-700 hover:bg-amber-500/20 dark:text-amber-400"
          >
            {generating
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Sparkles className="h-3.5 w-3.5" />}
            {generating ? "Gerando..." : "Atualizar agora"}
          </Button>
        </div>
      )}

      {/* ── Availability panel ────────────────────────────── */}
      {showAvailPanel ? (
        <AvailabilityPanel
          availability={availByDay}
          simuladoPref={simuladoPref}
          onSaveAndGenerate={handleSaveAndGenerate}
          onClose={() => setShowAvailPanel(false)}
        />
      ) : (
        /* IA info bar — only shown when panel is closed */
        <div className="flex items-start gap-2.5 rounded-lg border border-[#b8860b]/20
          bg-[#b8860b]/5 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#b8860b]" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">60%</strong> do plano vai para matérias críticas
            (&lt;40% acerto),{" "}
            <strong className="text-foreground">30%</strong> para intermediárias e{" "}
            <strong className="text-foreground">10%</strong> para as boas.
            {hasAvailSet
              ? " Sua disponibilidade configurada está sendo respeitada."
              : (
                <>
                  {" "}
                  <button
                    className="text-primary underline underline-offset-2 hover:no-underline"
                    onClick={() => setShowAvailPanel(true)}
                  >
                    Configure seus horários
                  </button>
                  {" "}para um plano mais preciso.
                </>
              )}
          </p>
        </div>
      )}

      {/* ── First-time empty state (no availability set) ──── */}
      {!hasAvailSet && !showAvailPanel && totalEvents === 0 && !loading && (
        <Card className="border-primary/20 bg-primary/[0.02]">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-14 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Clock className="h-8 w-8 text-primary" />
            </div>
            <div className="max-w-sm space-y-1.5">
              <h3 className="font-semibold text-foreground">
                Comece configurando seus horários
              </h3>
              <p className="text-sm text-muted-foreground">
                Diga à IA quando você pode estudar e ela vai montar um plano personalizado para você.
              </p>
            </div>
            <Button onClick={() => setShowAvailPanel(true)} className="gap-2">
              <Clock className="h-4 w-4" />
              Configurar horários disponíveis
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Week navigation ───────────────────────────────── */}
      {(hasAvailSet || totalEvents > 0) && (
        <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-2">
          <Button variant="ghost" size="icon" className="h-8 w-8"
            onClick={() => setWeekOffset((o) => o - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center">
            <span className="text-sm font-semibold text-foreground capitalize">{weekLabel}</span>
            {weekOffset === 0 && (
              <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 font-mono
                text-[10px] font-medium text-primary">
                Esta semana
              </span>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8"
            onClick={() => setWeekOffset((o) => o + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* ── Stats bar ─────────────────────────────────────── */}
      {!loading && totalEvents > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Treinos",   n: events.filter((e) => e.type === "study").length,    color: "text-primary",    dot: "bg-primary" },
            { label: "Revisões",  n: events.filter((e) => e.type === "revisao").length,  color: "text-yellow-500", dot: "bg-yellow-500" },
            { label: "Simulados", n: events.filter((e) => e.type === "simulado").length, color: "text-blue-500",   dot: "bg-blue-500" },
          ].map(({ label, n, color, dot }) => (
            <div key={label} className="flex flex-col items-center rounded-lg bg-muted/40 py-2.5">
              <div className={`flex items-center gap-1.5 text-xl font-black ${color}`}>
                <span className={`h-2 w-2 rounded-full ${dot}`} />
                {n}
              </div>
              <span className="mt-0.5 text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Calendar content ──────────────────────────────── */}
      {loading ? (
        <div className="h-64 animate-pulse rounded-xl bg-muted" />

      ) : totalEvents === 0 && hasAvailSet && weekOffset === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Brain className="h-8 w-8 text-primary" />
            </div>
            <div className="max-w-sm space-y-1.5">
              <h3 className="font-semibold text-foreground">Horários configurados!</h3>
              <p className="text-sm text-muted-foreground">
                Clique em <strong>Gerar Plano</strong> ou use o painel de horários para criar sua agenda.
              </p>
            </div>
            <Button onClick={handleGerar} disabled={generating} className="gap-2">
              {generating
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Sparkles className="h-4 w-4" />}
              Gerar Plano
            </Button>
          </CardContent>
        </Card>

      ) : totalEvents === 0 && weekOffset !== 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <CalendarDays className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Nenhum evento nesta semana.</p>
          </CardContent>
        </Card>

      ) : totalEvents > 0 ? (
        <>
          <CalendarGrid
            weekDays={weekDays}
            eventsByDate={eventsByDate}
            availByDay={availByDay}
            today={today}
            onEventClick={setSelectedEvent}
          />
          <MobileList
            weekDays={weekDays}
            eventsByDate={eventsByDate}
            today={today}
            onEventClick={setSelectedEvent}
          />
        </>
      ) : null}

      {/* ── Legend ────────────────────────────────────────── */}
      {!loading && totalEvents > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
          {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
            const Icon = cfg.icon
            return (
              <div key={key} className="flex items-center gap-1.5">
                <Icon className="h-3 w-3" />{cfg.label}
              </div>
            )
          })}
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-[#b8860b]" />Gerado por IA
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <div className="flex items-center gap-1"><div className="h-3 w-1 rounded-full bg-destructive" />Crítico</div>
            <div className="flex items-center gap-1"><div className="h-3 w-1 rounded-full bg-yellow-500" />Intermediário</div>
            <div className="flex items-center gap-1"><div className="h-3 w-1 rounded-full bg-primary" />Bom</div>
          </div>
        </div>
      )}

      {/* ── Como funciona ────────────────────────────────── */}
      <div className="rounded-lg border border-border overflow-hidden">
        <button
          type="button"
          onClick={() => setShowRules((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3
            text-left hover:bg-muted/40 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Info className="h-4 w-4 text-muted-foreground" />
            Como funciona a Agenda Inteligente?
          </span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200
            ${showRules ? "rotate-180" : ""}`} />
        </button>

        {showRules && (
          <div className="border-t border-border px-4 pb-5 pt-4 space-y-5 text-sm">

            {/* Classificação */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Classificação de matérias
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { dot: "bg-destructive",  label: "Crítica",        range: "< 40% de acerto",   pct: "60% do plano" },
                  { dot: "bg-yellow-500",   label: "Intermediária",  range: "40–70% de acerto",  pct: "30% do plano" },
                  { dot: "bg-primary",      label: "Boa",            range: "> 70% de acerto",   pct: "10% do plano" },
                ].map(({ dot, label, range, pct }) => (
                  <div key={label} className="flex items-start gap-2.5 rounded-lg bg-muted/40 px-3 py-2.5">
                    <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${dot}`} />
                    <div>
                      <p className="font-medium text-foreground text-xs">{label}</p>
                      <p className="text-[11px] text-muted-foreground">{range}</p>
                      <p className="text-[11px] font-semibold text-foreground mt-0.5">{pct}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Estrutura da semana */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Estrutura da semana
              </p>
              <div className="space-y-1.5">
                {[
                  { icon: BookOpen,  color: "text-primary",    label: "Dias de treino",   desc: "2 sessões/dia — Treino (90 min, 20 questões) + Revisão (60 min, 10 questões)" },
                  { icon: FileText,  color: "text-blue-500",   label: "Simulado completo", desc: `5h · 80 questões — ${simuladoPref === "weekend" ? "no fim de semana" : "num dia útil"}, no maior bloco de tempo livre (como a prova real)` },
                  { icon: RotateCcw, color: "text-yellow-500", label: "Revisão geral",     desc: "Consolidação da semana — no último dia disponível da sua agenda" },
                ].map(({ icon: Icon, color, label, desc }) => (
                  <div key={label} className="flex items-start gap-3 rounded-lg border border-border/60 px-3 py-2.5">
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground">{label}</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cadência */}
            <div className="flex items-start gap-2.5 rounded-lg border border-primary/20 bg-primary/[0.04] px-3 py-2.5">
              <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Regenere todo início de semana</strong>
                {" "}para que o plano reflita seu desempenho mais recente. A IA reordena as prioridades
                automaticamente conforme suas notas evoluem.
              </p>
            </div>

          </div>
        )}
      </div>

      {/* ── Event detail modal ────────────────────────────── */}
      <EventDetailModal
        event={selectedEvent}
        open={selectedEvent !== null}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  )
}
