"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Search, MoreHorizontal, ShieldOff, ShieldCheck, Loader2, Activity } from "lucide-react"
import { useRouter } from "next/navigation"
import { formatarDataBrasil, formatarDataHoraBrasil, tempoRelativo } from "@/lib/datas"

interface Usuario {
  id: string
  role: string
  plano: string
  email: string
  nome: string
  criadoEm: string
  ultimoAcesso: string | null
  simulados: number
  questoes: number
}

interface Contagens {
  total: number
  admins: number
  bloqueados: number
}

type Ordenacao = "recentes" | "acesso"

function PlanoBadge({ plano }: { plano: string }) {
  if (plano === "pro") {
    return <Badge className="bg-primary/15 text-primary hover:bg-primary/15 border-0">Pro</Badge>
  }
  if (plano === "aprovacao") {
    return <Badge className="bg-[#fff4cc] text-[#b8860b] hover:bg-[#fff4cc] dark:bg-[#b8860b]/15 dark:text-[#f0c75e] border-0">Aprovação</Badge>
  }
  return <Badge variant="secondary">Grátis</Badge>
}

export default function AdminUsuariosPage() {
  const router = useRouter()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [contagens, setContagens] = useState<Contagens>({ total: 0, admins: 0, bloqueados: 0 })
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [busca, setBusca] = useState("")
  const [q, setQ] = useState("")
  const [sort, setSort] = useState<Ordenacao>("recentes")
  const [atualizando, setAtualizando] = useState<string | null>(null)

  // Debounce da busca: só consulta a API depois de 300ms sem digitar.
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(busca.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [busca])

  const fetchUsuarios = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), sort })
    if (q) params.set("q", q)
    const res = await fetch(`/api/admin/usuarios?${params}`)
    const data = await res.json()
    setUsuarios(data.users ?? [])
    setContagens(data.contagens ?? { total: 0, admins: 0, bloqueados: 0 })
    setPagination(data.pagination ?? { total: 0, page: 1, totalPages: 1 })
    setLoading(false)
  }, [page, q, sort])

  useEffect(() => { fetchUsuarios() }, [fetchUsuarios])

  const toggleRole = async (id: string, roleAtual: string) => {
    const novoRole = roleAtual === "blocked" ? "user" : "blocked"
    setAtualizando(id)
    await fetch(`/api/admin/usuarios/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: novoRole }),
    })
    setAtualizando(null)
    fetchUsuarios()
  }

  const setAdmin = async (id: string) => {
    setAtualizando(id)
    await fetch(`/api/admin/usuarios/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "admin" }),
    })
    setAtualizando(null)
    fetchUsuarios()
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin": return <Badge className="bg-primary">Admin</Badge>
      case "blocked": return <Badge variant="destructive">Bloqueado</Badge>
      default: return <Badge variant="secondary">Usuário</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Gerenciar Usuários</h1>
        <p className="text-muted-foreground">Visualize e gerencie todos os usuários da plataforma</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-foreground">{contagens.total.toLocaleString("pt-BR")}</p>
            <p className="text-xs text-muted-foreground">Total de usuários</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-primary">{contagens.admins}</p>
            <p className="text-xs text-muted-foreground">Admins</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-destructive">{contagens.bloqueados}</p>
            <p className="text-xs text-muted-foreground">Bloqueados</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Lista de Usuários</CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome ou email…"
                className="w-full pl-8 sm:w-64"
              />
            </div>
            <Select value={sort} onValueChange={(v) => { setSort(v as Ordenacao); setPage(1) }}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recentes">Mais recentes</SelectItem>
                <SelectItem value="acesso">Último acesso</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center h-32 items-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : usuarios.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Nenhum usuário encontrado{q ? ` para “${q}”` : ""}.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead>Último acesso</TableHead>
                  <TableHead>Simulados</TableHead>
                  <TableHead>Questões</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium text-foreground">
                          {u.nome || "Sem nome"}
                        </span>
                        <span className="text-xs text-muted-foreground">{u.email}</span>
                      </div>
                    </TableCell>
                    <TableCell><PlanoBadge plano={u.plano} /></TableCell>
                    <TableCell>{getRoleBadge(u.role)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatarDataBrasil(u.criadoEm)}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {u.ultimoAcesso ? (
                        <span title={formatarDataHoraBrasil(u.ultimoAcesso)}>
                          {tempoRelativo(u.ultimoAcesso)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Nunca acessou</span>
                      )}
                    </TableCell>
                    <TableCell>{u.simulados}</TableCell>
                    <TableCell>{u.questoes}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" disabled={atualizando === u.id}>
                            {atualizando === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/admin/usuarios/${u.id}`)}>
                            <Activity className="mr-2 h-4 w-4" /> Ver atividade
                          </DropdownMenuItem>
                          {u.role !== "admin" && (
                            <DropdownMenuItem onClick={() => setAdmin(u.id)}>
                              <ShieldCheck className="mr-2 h-4 w-4" /> Tornar Admin
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => toggleRole(u.id, u.role)}>
                            {u.role === "blocked"
                              ? <><ShieldCheck className="mr-2 h-4 w-4" /> Desbloquear</>
                              : <><ShieldOff className="mr-2 h-4 w-4 text-destructive" /><span className="text-destructive">Bloquear</span></>
                            }
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
            <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1 || loading}>Anterior</Button>
            <span className="px-4 text-sm text-muted-foreground">Página {pagination.page} de {pagination.totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= pagination.totalPages || loading}>Próximo</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
