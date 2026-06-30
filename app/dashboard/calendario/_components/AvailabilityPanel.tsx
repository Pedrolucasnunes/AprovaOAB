"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Sparkles, X, Plus, Loader2, Clock,
  Moon, CalendarDays, Coffee, ChevronDown, FileText,
} from "lucide-react"

// ─────────────────────────────────────────────────────────────────────────────
// Shared types (re-used by CalendarGrid and page.tsx)
// ─────────────────────────────────────────────────────────────────────────────
export interface TimeSlot {
  start_time: string
  end_time:   string
}

export interface DayAvailability {
  enabled: boolean
  slots:   TimeSlot[]
}

/** Quando alocar o simulado completo: num dia útil ou no fim de semana. */
export type SimuladoPref = "weekday" | "weekend"

// ─────────────────────────────────────────────────────────────────────────────
// Time options — 06:00 → 23:30 in 30-min steps
// ─────────────────────────────────────────────────────────────────────────────
const TIME_OPTIONS: string[] = (() => {
  const opts: string[] = []
  for (let h = 6; h <= 23; h++) {
    opts.push(`${String(h).padStart(2, "0")}:00`)
    opts.push(`${String(h).padStart(2, "0")}:30`)
  }
  return opts
})()

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]

/** Snap a raw HH:MM string to the nearest 30-min option in TIME_OPTIONS */
function snapToOption(time: string): string {
  if (TIME_OPTIONS.includes(time)) return time
  // Find closest match
  const [h, m] = time.split(":").map(Number)
  const snapped = m < 15 ? `${String(h).padStart(2, "0")}:00`
    : m < 45 ? `${String(h).padStart(2, "0")}:30`
    : `${String(Math.min(h + 1, 23)).padStart(2, "0")}:00`
  return TIME_OPTIONS.includes(snapped) ? snapped : TIME_OPTIONS[0]
}

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(":").map(Number)
  const total  = h * 60 + m + mins
  const capped = Math.min(total, 23 * 60 + 30) // cap at 23:30
  return `${String(Math.floor(capped / 60)).padStart(2, "0")}:${String(capped % 60).padStart(2, "0")}`
}

function slotMinutes(slot: TimeSlot): number {
  const [sh, sm] = slot.start_time.split(":").map(Number)
  const [eh, em] = slot.end_time.split(":").map(Number)
  return Math.max((eh * 60 + em) - (sh * 60 + sm), 0)
}

function isSlotValid(slot: TimeSlot): boolean {
  const [sh, sm] = slot.start_time.split(":").map(Number)
  const [eh, em] = slot.end_time.split(":").map(Number)
  return (eh * 60 + em) > (sh * 60 + sm)
}

function calcWeeklyHours(avail: DayAvailability[]): number {
  let total = 0
  for (const day of avail) {
    if (!day.enabled) continue
    for (const s of day.slots) total += slotMinutes(s)
  }
  return Math.round((total / 60) * 10) / 10
}

// ─────────────────────────────────────────────────────────────────────────────
// Presets
// ─────────────────────────────────────────────────────────────────────────────
interface Preset {
  label: string
  icon:  React.ElementType
  apply: () => DayAvailability[]
}

const PRESETS: Preset[] = [
  {
    label: "Dias úteis à noite",
    icon:  Moon,
    apply: () =>
      WEEKDAYS.map((_, i) => ({
        enabled: i >= 1 && i <= 5,
        slots:   [{ start_time: "19:00", end_time: "22:00" }],
      })),
  },
  {
    label: "Todos os dias",
    icon:  CalendarDays,
    apply: () =>
      WEEKDAYS.map(() => ({
        enabled: true,
        slots:   [{ start_time: "19:00", end_time: "22:00" }],
      })),
  },
  {
    label: "Fins de semana",
    icon:  Coffee,
    apply: () =>
      WEEKDAYS.map((_, i) => ({
        enabled: i === 0 || i === 6,
        slots:   [{ start_time: "09:00", end_time: "18:00" }],
      })),
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Toggle — purely visual; parent <button> owns the click
// ─────────────────────────────────────────────────────────────────────────────
function ToggleVisual({ checked }: { checked: boolean }) {
  return (
    <div
      aria-hidden
      className={`relative h-5 w-9 rounded-full shrink-0 transition-colors duration-200
        ${checked ? "bg-primary" : "bg-muted-foreground/25"}`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm
          transition-transform duration-200
          ${checked ? "translate-x-[18px]" : "translate-x-0.5"}`}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TimeSelect — styled dropdown with 30-min intervals
// ─────────────────────────────────────────────────────────────────────────────
function TimeSelect({
  value,
  onChange,
  label,
}: {
  value:    string
  onChange: (v: string) => void
  label?:   string
}) {
  const safeValue = snapToOption(value)

  return (
    <div className="group relative">
      {label && (
        <span className="absolute -top-5 left-0 text-[10px] text-muted-foreground select-none">
          {label}
        </span>
      )}
      <select
        value={safeValue}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-[6.5rem] cursor-pointer appearance-none rounded-md border border-input
          bg-background pl-3 pr-7 text-sm font-medium text-foreground
          transition-all duration-150
          hover:border-primary/60 hover:bg-primary/[0.03]
          focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
      >
        {TIME_OPTIONS.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
      {/* Custom chevron */}
      <ChevronDown
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2
          h-3 w-3 text-muted-foreground transition-colors group-hover:text-primary"
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AvailabilityPanel (main export)
// ─────────────────────────────────────────────────────────────────────────────
interface Props {
  availability:      DayAvailability[]
  simuladoPref:      SimuladoPref
  onSaveAndGenerate: (avail: DayAvailability[], pref: SimuladoPref) => Promise<void>
  onClose:           () => void
}

export function AvailabilityPanel({ availability, simuladoPref, onSaveAndGenerate, onClose }: Props) {
  const [local, setLocal] = useState<DayAvailability[]>(() =>
    availability.map((d) => ({
      enabled: d.enabled,
      slots:   d.slots.length > 0
        ? d.slots.map((s) => ({ ...s }))
        : [{ start_time: "19:00", end_time: "22:00" }],
    }))
  )
  const [pref, setPref]     = useState<SimuladoPref>(simuladoPref)
  const [saving, setSaving] = useState(false)

  // ── Mutations ──────────────────────────────────────────────────
  const toggle = (i: number) =>
    setLocal((p) => p.map((d, idx) => idx === i ? { ...d, enabled: !d.enabled } : d))

  const setSlot = (dayIdx: number, slotIdx: number, field: keyof TimeSlot, val: string) =>
    setLocal((p) =>
      p.map((d, i) => {
        if (i !== dayIdx) return d
        return {
          ...d,
          slots: d.slots.map((s, si) => {
            if (si !== slotIdx) return s
            const updated = { ...s, [field]: val }
            if (field === "start_time" && !isSlotValid(updated)) {
              updated.end_time = snapToOption(addMinutes(val, 60))
            }
            return updated
          }),
        }
      })
    )

  const addSlot = (dayIdx: number) =>
    setLocal((p) =>
      p.map((d, i) => {
        if (i !== dayIdx) return d
        const last     = d.slots[d.slots.length - 1]
        const newStart = last ? snapToOption(addMinutes(last.end_time, 30)) : "19:00"
        const newEnd   = snapToOption(addMinutes(newStart, 120))
        return { ...d, slots: [...d.slots, { start_time: newStart, end_time: newEnd }] }
      })
    )

  const removeSlot = (dayIdx: number, slotIdx: number) =>
    setLocal((p) =>
      p.map((d, i) => {
        if (i !== dayIdx) return d
        if (d.slots.length <= 1) return { ...d, enabled: false }
        return { ...d, slots: d.slots.filter((_, si) => si !== slotIdx) }
      })
    )

  const applyPreset = (preset: Preset) => setLocal(preset.apply())

  // ── Stats ──────────────────────────────────────────────────────
  const weeklyHours     = calcWeeklyHours(local)
  const activeDays      = local.filter((d) => d.enabled).length
  const hasInvalidSlots = local.some((d) => d.enabled && d.slots.some((s) => !isSlotValid(s)))

  // ── Save + generate ────────────────────────────────────────────
  async function handleSave() {
    setSaving(true)
    await onSaveAndGenerate(local, pref)
    setSaving(false)
  }

  // ─────────────────────────────────────────────────────────────
  return (
    <Card className="overflow-hidden border-primary/20">
      {/* Top accent line */}
      <div className="h-0.5 w-full bg-primary" />

      <CardContent className="p-5 space-y-5">

        {/* ── Header ────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Quando você pode estudar?
            </h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              A IA vai montar seu plano com base nesses horários
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md
              text-muted-foreground transition-all duration-150
              hover:bg-muted/70 hover:text-foreground active:scale-90"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Quick presets ─────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Atalhos:</span>
          {PRESETS.map((p) => {
            const Icon = p.icon
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p)}
                className="flex items-center gap-1.5 rounded-full border border-border bg-muted/50
                  px-3 py-1.5 text-xs text-foreground transition-all duration-150
                  hover:border-primary hover:bg-primary/20 hover:text-primary hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.3)]
                  hover:scale-[1.04] active:scale-95"
              >
                <Icon className="h-3 w-3" />
                {p.label}
              </button>
            )
          })}
        </div>

        {/* ── Preferência do simulado ───────────────────── */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-xs font-medium text-foreground">
              Quando prefere fazer o simulado?
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {([
              { value: "weekday", label: "Durante a semana", icon: CalendarDays },
              { value: "weekend", label: "Fim de semana",    icon: Coffee },
            ] as const).map(({ value, label, icon: Icon }) => {
              const active = pref === value
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPref(value)}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2
                    text-xs font-medium transition-all duration-150 active:scale-95
                    ${active
                      ? "border-primary bg-primary/10 text-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.3)]"
                      : "border-border bg-muted/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              )
            })}
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            O simulado completo dura 5h, como a prova real — que cai num domingo. No fim de semana
            costuma caber um bloco contínuo desse tamanho.
          </p>
        </div>

        {/* ── Days ──────────────────────────────────────── */}
        <div className="space-y-2">
          {local.map((day, i) => (
            <div
              key={i}
              className={`rounded-lg border transition-all duration-200
                ${day.enabled
                  ? "border-primary/30 bg-primary/[0.04] shadow-sm"
                  : "border-border/50 bg-muted/10"}`}
            >
              {/* ── Header row — entire row is one button ──── */}
              <button
                type="button"
                className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg
                  transition-all duration-150 select-none
                  ${day.enabled
                    ? "hover:bg-primary/[0.06]"
                    : "hover:bg-primary/[0.04] hover:border-primary/20"}`}
                onClick={() => toggle(i)}
              >
                {/* Day name */}
                <span
                  className={`w-[5.5rem] shrink-0 text-sm font-medium transition-colors duration-200
                    ${day.enabled ? "text-primary" : "text-muted-foreground"}`}
                >
                  {WEEKDAYS[i]}
                </span>

                <div className="flex-1" />

                {/* Summary when enabled */}
                {day.enabled && (
                  <span className="mr-3 text-xs text-muted-foreground tabular-nums">
                    {day.slots.length} horário{day.slots.length !== 1 ? "s" : ""}
                    {" · "}
                    {Math.round(
                      day.slots.reduce((acc, s) => acc + slotMinutes(s), 0) / 60 * 10
                    ) / 10}h
                  </span>
                )}

                {/* Visual toggle (no own click — parent button handles it) */}
                <ToggleVisual checked={day.enabled} />
              </button>

              {/* ── Slots — animated expand/collapse ─────── */}
              <div
                className="overflow-hidden transition-all duration-300 ease-in-out"
                style={{ maxHeight: day.enabled ? "20rem" : "0" }}
              >
                <div className="px-4 pb-4 pt-1 space-y-3 border-t border-primary/10">

                  {day.slots.map((slot, si) => (
                    <div key={si} className="flex items-end gap-3 flex-wrap">

                      {/* Start */}
                      <TimeSelect
                        label="Início"
                        value={slot.start_time}
                        onChange={(v) => setSlot(i, si, "start_time", v)}
                      />

                      {/* Separator */}
                      <span className="pb-2 text-sm font-mono text-muted-foreground select-none">
                        →
                      </span>

                      {/* End */}
                      <TimeSelect
                        label="Fim"
                        value={slot.end_time}
                        onChange={(v) => setSlot(i, si, "end_time", v)}
                      />

                      {/* Validation */}
                      {!isSlotValid(slot) && (
                        <span className="pb-2 text-xs font-medium text-destructive">
                          fim ≤ início
                        </span>
                      )}

                      {/* Remove */}
                      <button
                        type="button"
                        title="Remover horário"
                        onClick={() => removeSlot(i, si)}
                        className="mb-0.5 flex h-8 w-8 items-center justify-center rounded-md
                          text-muted-foreground/40 transition-all duration-150
                          hover:bg-red-500/20 hover:text-red-400 hover:scale-110
                          active:scale-90"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Add slot */}
                  <button
                    type="button"
                    onClick={() => addSlot(i)}
                    className="group mt-1 flex items-center gap-2 rounded-md px-2 py-1.5
                      text-xs text-primary/60 transition-all duration-150
                      hover:bg-primary/[0.06] hover:text-primary active:scale-95"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full
                      border border-primary/30 transition-colors
                      group-hover:border-primary group-hover:bg-primary/10">
                      <Plus className="h-3 w-3" />
                    </span>
                    Adicionar horário
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Weekly hours summary ──────────────────────── */}
        <div className={`rounded-lg border transition-all duration-300
          ${weeklyHours > 0
            ? "border-primary/20 bg-primary/[0.06] px-4 py-3"
            : "border-border/30 bg-muted/20 px-4 py-2.5"}`}
        >
          {weeklyHours > 0 ? (
            <div className="flex items-center gap-2.5">
              <Clock className="h-4 w-4 text-primary shrink-0" />
              <p className="text-sm text-foreground">
                Você terá aproximadamente{" "}
                <strong className="text-primary">{weeklyHours}h</strong>{" "}
                de estudo por semana em{" "}
                <strong className="text-primary">{activeDays}</strong>{" "}
                dia{activeDays !== 1 ? "s" : ""}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic text-center">
              Ative pelo menos um dia para ver o resumo semanal
            </p>
          )}
        </div>

        {/* ── Actions ───────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border">
          <Button
            onClick={handleSave}
            disabled={saving || weeklyHours === 0 || hasInvalidSlots}
            className="flex-1 sm:flex-none gap-2 transition-all duration-150 active:scale-[0.97]"
          >
            {saving
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Sparkles className="h-4 w-4" />}
            {saving ? "Gerando plano..." : "Gerar plano com esses horários"}
          </Button>
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancelar
          </Button>
        </div>

      </CardContent>
    </Card>
  )
}
