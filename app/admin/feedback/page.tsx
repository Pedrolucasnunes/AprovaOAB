"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Bug, Lightbulb, Star, Loader2, FileX } from "lucide-react"
import { toast } from "sonner"

interface FeedbackItem {
  id: string
  user_id: string
  user_nome: string
  user_email: string
  type: "bug" | "sugestao" | "elogio"
  message: string
  page: string | null
  created_at: string
}

interface Totais {
  total: number
  bug: number
  sugestao: number
  elogio: number
}

const TYPE_CONFIG = {
  bug: { label: "Bug", icon: Bug, badge: "destructive" as const, color: "text-destructive" },
  sugestao: { label: "Sugestão", icon: Lightbulb, badge: "secondary" as const, color: "text-yellow-600 dark:text-yellow-400" },
  elogio: { label: "Elogio", icon: Star, badge: "default" as const, color: "text-primary" },
}

type FilterType = "todos" | "bug" | "sugestao" | "elogio"

export default function AdminFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([])
  const [totais, setTotais] = useState<Totais | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>("todos")

  useEffect(() => {
    async function fetchFeedbacks() {
      try {
        const res = await fetch("/api/admin/feedback")
        const data = await res.json()
        if (!res.ok) {
          toast.error("Erro ao carregar feedbacks")
          return
        }
        setFeedbacks(data.feedbacks)
        setTotais(data.totais)
      } catch {
        toast.error("Erro inesperado ao carregar feedbacks")
      } finally {
        setLoading(false)
      }
    }
    fetchFeedbacks()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const filtered = filter === "todos" ? feedbacks : feedbacks.filter((f) => f.type === filter)

  const statsCards = totais
    ? [
        { label: "Total", value: totais.total, icon: MessageSquare, type: "todos" as FilterType },
        { label: "Bugs", value: totais.bug, icon: Bug, type: "bug" as FilterType },
        { label: "Sugestões", value: totais.sugestao, icon: Lightbulb, type: "sugestao" as FilterType },
        { label: "Elogios", value: totais.elogio, icon: Star, type: "elogio" as FilterType },
      ]
    : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Feedbacks</h1>
        <p className="text-muted-foreground">Mensagens enviadas pelos usuários da plataforma</p>
      </div>

      {/* ── Cards de resumo / filtro ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((card) => (
          <button
            key={card.label}
            onClick={() => setFilter(card.type)}
            className={`text-left rounded-xl border transition-colors ${
              filter === card.type
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-muted/50"
            }`}
          >
            <Card className="border-0 bg-transparent shadow-none">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.label}
                </CardTitle>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-bold text-foreground">{card.value}</span>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      {/* ── Lista de feedbacks ── */}
      <Card>
        <CardHeader>
          <CardTitle>
            {filter === "todos" ? "Todos os feedbacks" : `${TYPE_CONFIG[filter as Exclude<FilterType, "todos">].label}s`}
          </CardTitle>
          <CardDescription>
            {filtered.length} {filtered.length === 1 ? "registro" : "registros"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
              <FileX className="h-10 w-10" />
              <p className="text-sm">Nenhum feedback encontrado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((fb) => {
                const config = TYPE_CONFIG[fb.type]
                return (
                  <div
                    key={fb.id}
                    className="flex flex-col gap-2 rounded-lg border border-border p-4 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="flex flex-col gap-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={config.badge}>{config.label}</Badge>
                        {fb.page && (
                          <span className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
                            {fb.page}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{fb.message}</p>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-medium text-foreground truncate">
                          {fb.user_nome}
                        </span>
                        {fb.user_email && (
                          <span className="text-xs text-muted-foreground truncate">
                            {fb.user_email}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {new Date(fb.created_at).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
