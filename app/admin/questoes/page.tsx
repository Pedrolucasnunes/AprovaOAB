"use client"

import { toast } from "sonner"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Search, Plus, MoreHorizontal, Edit, Trash2, Loader2,
  Upload, FileText, CheckCircle2, AlertTriangle, Download,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

interface Questao {
  id: string
  enunciado: string
  alternativa_a: string
  alternativa_b: string
  alternativa_c: string
  alternativa_d: string
  resposta_correta: string
  dificuldade: string
  banca: string
  ano: number
  subject_id: string
  topic_id: string
  explicacao: string
  subject_name: string
}

interface QuestaoCSV {
  enunciado: string
  alternativa_a: string
  alternativa_b: string
  alternativa_c: string
  alternativa_d: string
  resposta_correta: string
  dificuldade: string
  banca: string
  ano: string
  subject_id: string
  topic_id: string
  explicacao: string
  incidencia_prova: string
  _valida: boolean
  _erros: string[]
}

const questaoVazia = {
  enunciado: "", alternativa_a: "", alternativa_b: "", alternativa_c: "", alternativa_d: "",
  resposta_correta: "A", dificuldade: "médio", banca: "", ano: new Date().getFullYear(),
  subject_id: "", topic_id: "", explicacao: "",
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n")
  if (lines.length < 2) return []

  const headers = lines[0].split(";").map(h => h.trim().replace(/^"|"$/g, ""))
  return lines.slice(1).map(line => {
    const values = line.split(";").map(v => v.trim().replace(/^"|"$/g, ""))
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]))
  })
}

function validarQuestao(q: Record<string, string>, subjectIds: string[]): { valida: boolean; erros: string[] } {
  const erros: string[] = []
  if (!q.enunciado) erros.push("Enunciado obrigatório")
  if (!q.alternativa_a) erros.push("Alternativa A obrigatória")
  if (!q.alternativa_b) erros.push("Alternativa B obrigatória")
  if (!q.alternativa_c) erros.push("Alternativa C obrigatória")
  if (!q.alternativa_d) erros.push("Alternativa D obrigatória")
  if (!q.resposta_correta || !["A", "B", "C", "D"].includes(q.resposta_correta.toUpperCase())) {
    erros.push("Resposta correta deve ser A, B, C ou D")
  }
  if (!q.subject_id) erros.push("subject_id obrigatório")
  else if (!subjectIds.includes(q.subject_id)) erros.push(`subject_id "${q.subject_id}" não encontrado`)

  return { valida: erros.length === 0, erros }
}

export default function AdminQuestoesPage() {
  const [questoes, setQuestoes] = useState<Questao[]>([])
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState("")
  const [banca, setBanca] = useState("todas")
  const [bancas, setBancas] = useState<string[]>([])
  const [page, setPage] = useState(1)

  // Modal criar/editar
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<Questao | null>(null)
  const [form, setForm] = useState(questaoVazia)
  const [salvando, setSalvando] = useState(false)
  const [deletando, setDeletando] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  // Modal importar CSV
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [csvPreview, setCsvPreview] = useState<QuestaoCSV[]>([])
  const [importando, setImportando] = useState(false)
  const [csvStep, setCsvStep] = useState<"upload" | "preview">("upload")
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.from("subjects").select("id, name").order("name")
      .then(({ data }) => setSubjects(data ?? []))
    // Mesma fonte de bancas do banco de questões do aluno
    fetch("/api/questions/filtros")
      .then((res) => res.json())
      .then((data) => setBancas(data.bancas ?? []))
  }, [])

  const fetchQuestoes = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (busca) params.set("busca", busca)
    if (banca !== "todas") params.set("banca", banca)

    const res = await fetch(`/api/admin/questoes?${params}`)
    const data = await res.json()
    setQuestoes(data.questions ?? [])
    setPagination(data.pagination ?? { total: 0, page: 1, totalPages: 0 })
    setLoading(false)
  }, [page, busca, banca])

  useEffect(() => { fetchQuestoes() }, [fetchQuestoes])

  const abrirCriar = () => {
    setEditando(null)
    setForm(questaoVazia)
    setModalOpen(true)
  }

  const abrirEditar = (q: Questao) => {
    setEditando(q)
    setForm({
      enunciado: q.enunciado, alternativa_a: q.alternativa_a, alternativa_b: q.alternativa_b,
      alternativa_c: q.alternativa_c, alternativa_d: q.alternativa_d,
      resposta_correta: q.resposta_correta, dificuldade: q.dificuldade,
      banca: q.banca, ano: q.ano, subject_id: q.subject_id,
      topic_id: q.topic_id, explicacao: q.explicacao,
    })
    setModalOpen(true)
  }

  const salvar = async () => {
    setSalvando(true)
    const url = editando ? `/api/admin/questoes/${editando.id}` : "/api/admin/questoes"
    const method = editando ? "PUT" : "POST"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })

    setSalvando(false)
    if (res.ok) {
      toast.success(editando ? "Questão atualizada!" : "Questão criada!")
      setModalOpen(false)
      fetchQuestoes()
    } else {
      toast.error("Erro ao salvar questão")
    }
  }

  const deletar = async (id: string) => {
    setDeletando(id)
    const res = await fetch(`/api/admin/questoes/${id}`, { method: "DELETE" })
    setDeletando(null)
    if (res.ok) {
      toast.success("Questão excluída")
      fetchQuestoes()
    } else {
      toast.error("Erro ao excluir questão")
    }
  }

  // ── CSV ──────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const rows = parseCSV(text)
      const subjectIds = subjects.map(s => s.id)

      const preview = rows.map(row => {
        const { valida, erros } = validarQuestao(row, subjectIds)
        return { ...row, _valida: valida, _erros: erros } as QuestaoCSV
      })

      setCsvPreview(preview)
      setCsvStep("preview")
    }
    reader.readAsText(file, "UTF-8")
  }

  const confirmarImportacao = async () => {
    const validas = csvPreview.filter(q => q._valida)
    if (validas.length === 0) {
      toast.error("Nenhuma questão válida para importar")
      return
    }

    setImportando(true)
    const res = await fetch("/api/admin/questoes/importar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questoes: validas }),
    })

    const data = await res.json()
    setImportando(false)

    if (res.ok) {
      toast.success(`${data.importadas} questões importadas com sucesso!`)
      setImportModalOpen(false)
      setCsvPreview([])
      setCsvStep("upload")
      fetchQuestoes()
    } else {
      toast.error(data.error ?? "Erro ao importar questões")
    }
  }

  const baixarTemplate = () => {
    const headers = "enunciado;alternativa_a;alternativa_b;alternativa_c;alternativa_d;resposta_correta;dificuldade;banca;ano;subject_id;topic_id;incidencia_prova;explicacao"
    const exemplo = "Qual é o princípio...;Alternativa A;Alternativa B;Alternativa C;Alternativa D;A;médio;FGV;2023;UUID_DA_DISCIPLINA;;1;Explicação opcional"
    const blob = new Blob([`${headers}\n${exemplo}`], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "template_questoes.csv"
    a.click()
  }

  const validasCount = csvPreview.filter(q => q._valida).length
  const invalidasCount = csvPreview.length - validasCount

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gerenciar Questões</h1>
          <p className="text-muted-foreground">Adicione, edite e gerencie o banco de questões</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setImportModalOpen(true); setCsvStep("upload"); setCsvPreview([]) }}>
            <Upload className="mr-2 h-4 w-4" /> Importar CSV
          </Button>
          <Button onClick={abrirCriar}>
            <Plus className="mr-2 h-4 w-4" /> Nova Questão
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-foreground">{pagination.total.toLocaleString("pt-BR")}</p>
            <p className="text-xs text-muted-foreground">Total de questões</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-primary">{subjects.length}</p>
            <p className="text-xs text-muted-foreground">Disciplinas cadastradas</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Banco de Questões</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Select value={banca} onValueChange={(v) => { setBanca(v); setPage(1) }}>
                <SelectTrigger className="w-full sm:w-72">
                  <SelectValue placeholder="Exame/Banca" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todos os exames</SelectItem>
                  {bancas.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar questão..."
                  value={busca}
                  onChange={(e) => { setBusca(e.target.value); setPage(1) }}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center h-32 items-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Enunciado</TableHead>
                  <TableHead>Disciplina</TableHead>
                  <TableHead className="hidden sm:table-cell">Banca/Ano</TableHead>
                  <TableHead className="hidden lg:table-cell">Dificuldade</TableHead>
                  <TableHead className="hidden lg:table-cell">Gabarito</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questoes.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="max-w-xs">
                      <p className="truncate text-sm">{q.enunciado}</p>
                    </TableCell>
                    <TableCell>{q.subject_name}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {q.banca} {q.ano}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {q.dificuldade && (
                        <Badge variant="secondary" className={
                          q.dificuldade === "fácil" ? "bg-primary/10 text-primary" :
                            q.dificuldade === "médio" || q.dificuldade === "média" ? "bg-warning/10 text-warning" :
                              "bg-destructive/10 text-destructive"
                        }>
                          {q.dificuldade}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge variant="outline">{q.resposta_correta}</Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" disabled={deletando === q.id}>
                            {deletando === q.id
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <MoreHorizontal className="h-4 w-4" />
                            }
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => abrirEditar(q)}>
                            <Edit className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setConfirmDelete(q.id)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="mt-4 flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1 || loading}>
              Anterior
            </Button>
            <span className="px-4 text-sm text-muted-foreground">
              Página {pagination.page} de {pagination.totalPages}
            </span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page === pagination.totalPages || loading}>
              Próximo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Modal criar/editar ── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar Questão" : "Nova Questão"}</DialogTitle>
            <DialogDescription>Preencha todos os campos obrigatórios</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Enunciado *</Label>
              <Textarea value={form.enunciado} onChange={e => setForm(f => ({ ...f, enunciado: e.target.value }))} rows={4} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {(["a", "b", "c", "d"] as const).map(l => (
                <div key={l} className="space-y-2">
                  <Label>Alternativa {l.toUpperCase()} *</Label>
                  <Input
                    value={form[`alternativa_${l}` as keyof typeof form] as string}
                    onChange={e => setForm(f => ({ ...f, [`alternativa_${l}`]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Resposta Correta *</Label>
                <Select value={form.resposta_correta} onValueChange={v => setForm(f => ({ ...f, resposta_correta: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["A", "B", "C", "D"].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Dificuldade</Label>
                <Select value={form.dificuldade} onValueChange={v => setForm(f => ({ ...f, dificuldade: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fácil">Fácil</SelectItem>
                    <SelectItem value="médio">Médio</SelectItem>
                    <SelectItem value="difícil">Difícil</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Disciplina *</Label>
                <Select value={form.subject_id} onValueChange={v => setForm(f => ({ ...f, subject_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Banca</Label>
                <Input value={form.banca} onChange={e => setForm(f => ({ ...f, banca: e.target.value }))} placeholder="Ex: FGV" />
              </div>
              <div className="space-y-2">
                <Label>Ano</Label>
                <Input type="number" value={form.ano} onChange={e => setForm(f => ({ ...f, ano: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Explicação</Label>
              <Textarea value={form.explicacao} onChange={e => setForm(f => ({ ...f, explicacao: e.target.value }))} rows={3} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button onClick={salvar} disabled={salvando}>
                {salvando ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal importar CSV ── */}
      <Dialog open={importModalOpen} onOpenChange={(open) => {
        setImportModalOpen(open)
        if (!open) { setCsvPreview([]); setCsvStep("upload") }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Importar Questões via CSV
            </DialogTitle>
            <DialogDescription>
              Faça upload de um arquivo CSV com as questões. Use ponto e vírgula (;) como separador.
            </DialogDescription>
          </DialogHeader>

          {csvStep === "upload" && (
            <div className="space-y-4">
              {/* Template download */}
              <div className="rounded-lg border border-border bg-secondary/30 p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Baixar template CSV</p>
                  <p className="text-xs text-muted-foreground">Use o template para garantir o formato correto</p>
                </div>
                <Button variant="outline" size="sm" onClick={baixarTemplate}>
                  <Download className="mr-2 h-4 w-4" /> Template
                </Button>
              </div>

              {/* Disciplinas disponíveis */}
              <div className="rounded-lg border border-border p-4 space-y-2">
                <p className="text-sm font-medium text-foreground">IDs das disciplinas disponíveis:</p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {subjects.map(s => (
                    <div key={s.id} className="flex items-center gap-2 text-xs">
                      <code className="bg-secondary px-1.5 py-0.5 rounded text-primary">{s.id}</code>
                      <span className="text-muted-foreground">{s.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upload */}
              <div
                className="rounded-lg border-2 border-dashed border-border p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">Clique para selecionar o arquivo CSV</p>
                <p className="text-xs text-muted-foreground mt-1">Separador: ponto e vírgula (;) • Encoding: UTF-8</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>
          )}

          {csvStep === "preview" && (
            <div className="space-y-4">
              {/* Resumo */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-border p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{csvPreview.length}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-center">
                  <p className="text-2xl font-bold text-primary">{validasCount}</p>
                  <p className="text-xs text-muted-foreground">Válidas</p>
                </div>
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-center">
                  <p className="text-2xl font-bold text-destructive">{invalidasCount}</p>
                  <p className="text-xs text-muted-foreground">Com erros</p>
                </div>
              </div>

              {/* Preview das questões */}
              <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
                {csvPreview.map((q, i) => (
                  <div
                    key={i}
                    className={`rounded-lg border p-3 space-y-1 ${q._valida
                        ? "border-primary/20 bg-primary/5"
                        : "border-destructive/20 bg-destructive/5"
                      }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {q._valida
                          ? <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                          : <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                        }
                        <span className="text-xs font-medium text-muted-foreground">#{i + 1}</span>
                      </div>
                      <Badge variant={q._valida ? "default" : "destructive"} className="text-xs">
                        {q._valida ? "Válida" : "Inválida"}
                      </Badge>
                    </div>
                    <p className="text-sm text-foreground line-clamp-2">{q.enunciado || "(sem enunciado)"}</p>
                    {!q._valida && (
                      <ul className="space-y-0.5">
                        {q._erros.map((erro, j) => (
                          <li key={j} className="text-xs text-destructive">• {erro}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2 justify-between pt-2 border-t border-border">
                <Button variant="outline" onClick={() => { setCsvStep("upload"); setCsvPreview([]); if (fileInputRef.current) fileInputRef.current.value = "" }}>
                  Voltar
                </Button>
                <Button
                  onClick={confirmarImportacao}
                  disabled={importando || validasCount === 0}
                >
                  {importando
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importando...</>
                    : <><Upload className="mr-2 h-4 w-4" /> Importar {validasCount} questões</>
                  }
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ConfirmDialog */}
      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={() => setConfirmDelete(null)}
        title="Excluir questão?"
        description="Esta ação não pode ser desfeita. A questão será removida permanentemente."
        confirmLabel="Excluir"
        destructive
        onConfirm={() => {
          if (confirmDelete) deletar(confirmDelete)
          setConfirmDelete(null)
        }}
      />
    </div>
  )
}