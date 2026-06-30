"use client"

import { useState, useRef, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Clock, Target } from "lucide-react"
import {
  CalendarEvent,
  TYPE_CONFIG,
  EVENT_DURATION_MIN,
  RECOMMENDED_QUESTIONS,
  parsePerformancePct,
  perfStyle,
  fmtLocalDate,
  fmtTimeRange,
} from "./EventDetailModal"
import type { DayAvailability } from "./AvailabilityPanel"
export type { DayAvailability }

// ─────────────────────────────────────────────────────────────────────────────
// Grid constants
// ─────────────────────────────────────────────────────────────────────────────
const HOUR_HEIGHT  = 64          // px por hora
const START_HOUR   = 6           // grade começa às 06:00
const END_HOUR     = 24          // grade termina às 24:00
const HOURS        = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)
const GRID_HEIGHT  = HOURS.length * HOUR_HEIGHT

// ─────────────────────────────────────────────────────────────────────────────
// Layout helpers
// ─────────────────────────────────────────────────────────────────────────────
function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
}

function timeToTop(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return ((h - START_HOUR) + m / 60) * HOUR_HEIGHT
}

function durationToHeight(type: string): number {
  return Math.max((EVENT_DURATION_MIN[type] ?? 60) / 60 * HOUR_HEIGHT, 28)
}

// ─────────────────────────────────────────────────────────────────────────────
// Collision detection
// Retorna cada evento com colIndex e colCount para renderizar lado a lado
// ─────────────────────────────────────────────────────────────────────────────
interface LayoutedEvent extends CalendarEvent {
  colIndex: number
  colCount: number
}

function layoutDayEvents(events: CalendarEvent[]): LayoutedEvent[] {
  if (!events.length) return []

  const sorted = [...events].sort(
    (a, b) => timeToMinutes(a.time) - timeToMinutes(b.time)
  )

  // Greedy: tenta encaixar em coluna existente antes de abrir nova
  const columns: { endMins: number }[][] = []
  const result: LayoutedEvent[] = []

  for (const event of sorted) {
    const startMins = timeToMinutes(event.time)
    const endMins   = startMins + (EVENT_DURATION_MIN[event.type] ?? 60)

    let placed = false
    for (let col = 0; col < columns.length; col++) {
      const last = columns[col][columns[col].length - 1]
      if (startMins >= last.endMins) {
        columns[col].push({ endMins })
        result.push({ ...event, colIndex: col, colCount: 0 })
        placed = true
        break
      }
    }

    if (!placed) {
      columns.push([{ endMins }])
      result.push({ ...event, colIndex: columns.length - 1, colCount: 0 })
    }
  }

  const totalCols = columns.length
  return result.map((e) => ({ ...e, colCount: totalCols }))
}

// DayAvailability is imported from AvailabilityPanel and re-exported above

// ─────────────────────────────────────────────────────────────────────────────
// Hover Tooltip
// ─────────────────────────────────────────────────────────────────────────────
function EventTooltip({ event, x, y }: { event: CalendarEvent; x: number; y: number }) {
  const cfg    = TYPE_CONFIG[event.type] ?? TYPE_CONFIG.study
  const Icon   = cfg.icon
  const pct    = parsePerformancePct(event.reason)
  const perf   = perfStyle(pct)
  const recQtd = RECOMMENDED_QUESTIONS[event.type] ?? 20
  const dur    = EVENT_DURATION_MIN[event.type] ?? 60

  const TOOLTIP_W = 264
  const winW   = typeof window !== "undefined" ? window.innerWidth : 1200
  const left   = x + TOOLTIP_W + 24 > winW ? Math.max(4, x - TOOLTIP_W - 8) : x + 16

  return (
    <div
      className="pointer-events-none fixed z-50 w-64 rounded-xl border border-border bg-popover shadow-xl p-4 space-y-3"
      style={{ top: Math.max(8, y - 80), left }}
    >
      {/* Title */}
      <div className="flex items-start gap-2">
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${cfg.color}`} />
        <span className="text-sm font-semibold text-foreground leading-snug">{event.title}</span>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="outline" className={`text-[10px] ${cfg.color} ${cfg.border} ${cfg.bg}`}>
          <Icon className="mr-1 h-2.5 w-2.5" />{cfg.label}
        </Badge>
        <Badge variant="outline" className="text-[10px] text-muted-foreground">
          <Clock className="mr-1 h-2.5 w-2.5" />
          {fmtTimeRange(event.time, dur)}
        </Badge>
        {event.is_auto && (
          <Badge variant="outline"
            className="text-[10px] border-[#b8860b]/30 bg-[#b8860b]/10 text-[#b8860b]">
            <Sparkles className="mr-1 h-2.5 w-2.5" />IA
          </Badge>
        )}
      </div>

      {/* Performance */}
      {pct !== null && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Acerto atual</span>
            <span className={`font-bold ${perf.color}`}>{pct}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className={`h-full rounded-full ${perf.barColor}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {/* Recommended */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Target className="h-3 w-3 text-primary shrink-0" />
        <span><strong className="text-foreground">{recQtd} questões</strong> recomendadas</span>
      </div>

      <p className="text-[11px] text-muted-foreground/80 leading-relaxed border-t border-border pt-2 line-clamp-3">
        {event.reason ?? "Clique para ver detalhes"}
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Event Block (inside grid)
// ─────────────────────────────────────────────────────────────────────────────
function EventBlock({
  event,
  colIndex,
  colCount,
  onHover,
  onClick,
}: {
  event:    CalendarEvent
  colIndex: number
  colCount: number
  onHover:  (e: CalendarEvent | null) => void
  onClick:  (e: CalendarEvent) => void
}) {
  const pct    = parsePerformancePct(event.reason)
  const perf   = perfStyle(pct)
  const top    = timeToTop(event.time)
  const height = durationToHeight(event.type)
  const cfg    = TYPE_CONFIG[event.type] ?? TYPE_CONFIG.study
  const Icon   = cfg.icon

  const isPast = (() => {
    const now      = new Date()
    const todayStr = fmtLocalDate(now)
    if (event.date < todayStr) return true
    if (event.date === todayStr) {
      const [h, m] = event.time.split(":").map(Number)
      return h * 60 + m < now.getHours() * 60 + now.getMinutes()
    }
    return false
  })()

  // Largura e posição horizontal para colunas paralelas
  const gutter  = 2   // px de espaço lateral
  const widthPct = 100 / colCount
  const leftPct  = colIndex * widthPct

  return (
    <div
      className={`absolute overflow-hidden rounded-md border-l-[3px] cursor-pointer
        bg-card hover:brightness-95 dark:hover:brightness-110
        transition-all select-none shadow-sm ${perf.border}
        ${isPast ? "opacity-50" : ""}`}
      style={{
        top,
        height:     Math.max(height, 28),
        left:       `calc(${leftPct}% + ${gutter}px)`,
        width:      `calc(${widthPct}% - ${gutter * 2}px)`,
      }}
      onMouseEnter={() => onHover(event)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onClick(event)}
    >
      {/* Inner padding */}
      <div className="h-full px-1.5 pt-1 pb-0.5 flex flex-col justify-start">

        {/* Title row */}
        <div className="flex items-start gap-1 min-w-0">
          {event.is_auto && (
            <Sparkles className="mt-0.5 h-2.5 w-2.5 shrink-0 text-[#b8860b]" />
          )}
          <span className="text-[11px] font-semibold text-foreground leading-tight truncate">
            {event.title}
          </span>
        </div>

        {/* Time + type icon — only if there's space */}
        {height >= 48 && (
          <div className="flex items-center gap-1 mt-0.5">
            <Icon className={`h-2.5 w-2.5 shrink-0 ${cfg.color}`} />
            <span className="font-mono text-[10px] text-muted-foreground">
              {event.time.slice(0, 5)}
            </span>
          </div>
        )}

        {/* Performance % — only if there's more space */}
        {height >= 72 && pct !== null && (
          <span className={`text-[10px] font-medium mt-0.5 ${perf.color}`}>
            {pct}% de acerto
          </span>
        )}

        {/* Reason preview — only if tall enough */}
        {height >= 96 && event.reason && (
          <p className="text-[9px] text-muted-foreground mt-1 leading-tight line-clamp-2">
            {event.reason}
          </p>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Day Column
// ─────────────────────────────────────────────────────────────────────────────
function DayColumn({
  dateStr,
  events,
  availability,
  isToday,
  onHover,
  onEventClick,
}: {
  dateStr:      string
  events:       CalendarEvent[]
  availability: DayAvailability | null
  isToday:      boolean
  onHover:      (e: CalendarEvent | null) => void
  onEventClick: (e: CalendarEvent) => void
}) {
  const layouted = layoutDayEvents(events)

  return (
    <div
      className={`flex-1 relative border-l border-border/40 min-w-0
        ${isToday ? "bg-primary/[0.025]" : ""}`}
      style={{ height: GRID_HEIGHT }}
    >
      {/* Hour lines */}
      {HOURS.map((h) => (
        <div
          key={h}
          className="absolute w-full border-t border-border/30"
          style={{ top: (h - START_HOUR) * HOUR_HEIGHT }}
        />
      ))}

      {/* Half-hour lines (lighter) */}
      {HOURS.map((h) => (
        <div
          key={`${h}-half`}
          className="absolute w-full border-t border-border/15"
          style={{ top: (h - START_HOUR) * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
        />
      ))}

      {/* Availability highlights (one block per slot) */}
      {availability?.enabled && availability.slots.map((slot, si) => (
        <div
          key={si}
          className="absolute w-full bg-primary/[0.07] border-l-2 border-primary/20"
          style={{
            top:    timeToTop(slot.start_time),
            height: Math.max(timeToTop(slot.end_time) - timeToTop(slot.start_time), 0),
          }}
        />
      ))}

      {/* Events */}
      {layouted.map((e) => (
        <EventBlock
          key={e.id}
          event={e}
          colIndex={e.colIndex}
          colCount={e.colCount}
          onHover={onHover}
          onClick={onEventClick}
        />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Current time indicator
// ─────────────────────────────────────────────────────────────────────────────
function CurrentTimeLine() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const h = now.getHours()
  const m = now.getMinutes()
  if (h < START_HOUR || h >= END_HOUR) return null

  const top = ((h - START_HOUR) + m / 60) * HOUR_HEIGHT

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
      style={{ top }}
    >
      <div className="h-2 w-2 shrink-0 rounded-full bg-destructive" />
      <div className="h-px flex-1 bg-destructive/60" />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Weekday labels helper
// ─────────────────────────────────────────────────────────────────────────────
const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

function parseDateStr(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number)
  const date = new Date(y, m - 1, d)
  return { y, m, d, dow: date.getDay() }
}

// ─────────────────────────────────────────────────────────────────────────────
// Calendar Grid (public component)
// ─────────────────────────────────────────────────────────────────────────────
export function CalendarGrid({
  weekDays,
  eventsByDate,
  availByDay,
  today,
  onEventClick,
}: {
  weekDays:     string[]
  eventsByDate: Record<string, CalendarEvent[]>
  availByDay:   DayAvailability[]
  today:        string
  onEventClick: (event: CalendarEvent) => void
}) {
  const [hoveredEvent, setHoveredEvent] = useState<CalendarEvent | null>(null)
  const [mousePos, setMousePos]         = useState({ x: 0, y: 0 })
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!scrollRef.current) return
    const now    = new Date()
    const h      = now.getHours()
    const target = Math.max(START_HOUR, Math.min(h - 1, END_HOUR - 4))
    scrollRef.current.scrollTop = (target - START_HOUR) * HOUR_HEIGHT
  }, [])

  return (
    <div
      className="relative hidden md:flex flex-col rounded-xl border border-border overflow-hidden bg-card"
      onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
    >

      {/* ── Day headers ─────────────────────────────────── */}
      <div className="flex shrink-0 border-b border-border bg-card/95 backdrop-blur-sm z-10">
        <div className="w-14 shrink-0 border-r border-border/40" />
        {weekDays.map((dateStr) => {
          const { d, dow } = parseDateStr(dateStr)
          const isT = dateStr === today
          return (
            <div
              key={dateStr}
              className={`flex-1 flex flex-col items-center justify-center py-3 min-w-0
                ${isT ? "bg-primary/5" : ""}`}
            >
              <span className={`text-[10px] font-semibold uppercase tracking-widest
                ${isT ? "text-primary" : "text-muted-foreground"}`}>
                {WEEKDAYS_SHORT[dow]}
              </span>
              <div
                className={`mt-1 flex h-8 w-8 items-center justify-center rounded-full
                  text-base font-black leading-none
                  ${isT
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground"}`}
                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
              >
                {d}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Scrollable body ──────────────────────────────── */}
      <div ref={scrollRef} className="flex overflow-y-auto" style={{ maxHeight: 580 }}>

        {/* Time gutter */}
        <div
          className="w-14 shrink-0 relative border-r border-border/40 bg-card/80"
          style={{ height: GRID_HEIGHT }}
        >
          {HOURS.map((h) => (
            <div
              key={h}
              className="absolute w-full flex items-start justify-end pr-2 select-none"
              style={{ top: (h - START_HOUR) * HOUR_HEIGHT - 8 }}
            >
              <span className="text-[10px] text-muted-foreground/50 font-mono">
                {String(h).padStart(2, "0")}:00
              </span>
            </div>
          ))}
        </div>

        {/* Day columns + current time line */}
        <div className="relative flex flex-1 min-w-0" style={{ height: GRID_HEIGHT }}>
          {weekDays.map((dateStr) => {
            const { dow } = parseDateStr(dateStr)
            return (
              <DayColumn
                key={dateStr}
                dateStr={dateStr}
                events={eventsByDate[dateStr] ?? []}
                availability={availByDay[dow] ?? null}
                isToday={dateStr === today}
                onHover={setHoveredEvent}
                onEventClick={onEventClick}
              />
            )
          })}
          <CurrentTimeLine />
        </div>
      </div>

      {/* ── Hover tooltip ────────────────────────────────── */}
      {hoveredEvent && (
        <EventTooltip event={hoveredEvent} x={mousePos.x} y={mousePos.y} />
      )}
    </div>
  )
}
