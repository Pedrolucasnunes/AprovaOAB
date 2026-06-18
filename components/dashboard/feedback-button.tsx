"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { MessageSquarePlus, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const TYPES = [
  { value: "bug", label: "🐛 Bug" },
  { value: "sugestao", label: "💡 Sugestão" },
  { value: "elogio", label: "⭐ Elogio" },
] as const

type FeedbackType = (typeof TYPES)[number]["value"]

export function FeedbackButton() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<FeedbackType>("sugestao")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  // Oculta nas páginas de resolução de questões (simulado ativo, treino e banco de questões)
  const ocultarEmQuestoes =
    /^\/dashboard\/simulados\/[^/]+$/.test(pathname) ||
    pathname === "/dashboard/treino" ||
    pathname === "/dashboard/questoes"
  if (ocultarEmQuestoes) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return

    setLoading(true)
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, message: message.trim(), page: pathname }),
      })

      if (!res.ok) throw new Error()

      toast.success("Feedback enviado! Obrigado.")
      setMessage("")
      setType("sugestao")
      setOpen(false)
    } catch {
      toast.error("Erro ao enviar feedback. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Enviar feedback"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95 cursor-pointer"
      >
        <MessageSquarePlus className="h-4 w-4" />
        Feedback
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar feedback</DialogTitle>
            <DialogDescription>
              Sua opinião nos ajuda a melhorar a plataforma.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="flex gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={cn(
                    "flex-1 rounded-lg border py-2 text-sm transition-colors cursor-pointer",
                    type === t.value
                      ? "border-primary bg-primary/10 font-medium text-primary"
                      : "border-border hover:bg-muted"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <Textarea
              placeholder="Descreva seu feedback..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="resize-none"
              required
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || !message.trim()}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
