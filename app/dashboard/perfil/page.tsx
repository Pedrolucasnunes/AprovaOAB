"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { User, Mail, Lock, Trophy, BookOpen, Target, Loader2, ExternalLink, ArrowRight } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import Link from "next/link"

export default function PerfilPage() {
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [confirmSair, setConfirmSair] = useState(false)
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [dataCadastro, setDataCadastro] = useState("")
  const [novaSenha, setNovaSenha] = useState("")
  const [confirmarSenha, setConfirmarSenha] = useState("")
  const [stats, setStats] = useState({ simuladosFeitos: 0, questoesResolvidas: 0, taxaAcerto: 0 })
  const [plano, setPlano] = useState<"free" | "pro" | "aprovacao">("free")
  const [stripeCustomerId, setStripeCustomerId] = useState<string | null>(null)
  const [abrindoPortal, setAbrindoPortal] = useState(false)

  useEffect(() => {
    async function init() {
      // ✅ createBrowserClient dentro do componente
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setEmail(user.email ?? "")
      setNome(user.user_metadata?.nome ?? user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "")
      setDataCadastro(new Date(user.created_at).toLocaleDateString("pt-BR", {
        day: "2-digit", month: "short", year: "numeric"
      }))

      // ✅ Sem userId na chamada — API obtém do Auth
      const [dashRes, simuladosRes, usuarioRes] = await Promise.all([
        fetch("/api/dashboard"),
        supabase.from("simulados").select("id", { count: "exact" }).eq("user_id", user.id).gt("acertos", 0),
        supabase.from("users").select("plano, stripe_customer_id").eq("id", user.id).single(),
      ])

      const dashData = await dashRes.json()

      if (dashRes.ok) {
        setStats({
          simuladosFeitos: simuladosRes.count ?? 0,
          questoesResolvidas: dashData.resumo?.totalRespondidas ?? 0,
          taxaAcerto: dashData.resumo?.taxaGeralAcerto ?? 0,
        })
      }

      setPlano((usuarioRes.data?.plano as "free" | "pro" | "aprovacao") ?? "free")
      setStripeCustomerId(usuarioRes.data?.stripe_customer_id ?? null)

      setLoading(false)
    }
    init()
  }, [])

  const handlePortal = async () => {
    setAbrindoPortal(true)
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error("Erro ao acessar o portal. Tente novamente.")
      }
    } catch {
      toast.error("Erro inesperado.")
    } finally {
      setAbrindoPortal(false)
    }
  }

  const getIniciais = (nome: string) =>
    nome.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase() || "?"

  const handleSalvar = async () => {
    setSalvando(true)
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const updates: any = { data: { nome, full_name: nome } }

      if (novaSenha) {
        if (novaSenha.length < 8) {
          toast.error("A nova senha deve ter pelo menos 8 caracteres.")
          setSalvando(false)
          return
        }
        if (novaSenha !== confirmarSenha) {
          toast.error("As senhas não coincidem.")
          setSalvando(false)
          return
        }
        updates.password = novaSenha
      }

      const { error } = await supabase.auth.updateUser(updates)

      if (error) {
        toast.error(error.message)
      } else {
        toast.success("Perfil atualizado com sucesso!")
        setIsEditing(false)
        setNovaSenha("")
        setConfirmarSenha("")
      }
    } catch {
      toast.error("Erro inesperado ao salvar.")
    } finally {
      setSalvando(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Perfil</h1>
        <p className="text-muted-foreground">Gerencie suas informações pessoais</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Informações Pessoais</CardTitle>
                  <CardDescription>Atualize seus dados de perfil</CardDescription>
                </div>
                {isEditing ? (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { setIsEditing(false); setNovaSenha(""); setConfirmarSenha("") }} disabled={salvando}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSalvar} disabled={salvando}>
                      {salvando ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : "Salvar"}
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" onClick={() => setIsEditing(true)}>Editar</Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                    {getIniciais(nome)}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} disabled={!isEditing} className="pl-10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="email" type="email" value={email} disabled className="pl-10 opacity-60" />
                  </div>
                  <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado</p>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="mb-4 font-medium text-foreground">Alterar Senha</h4>
                <div className="grid gap-4 sm:grid-cols-2 max-w-xl">
                  <div className="space-y-2">
                    <Label htmlFor="nova-senha">Nova senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="nova-senha"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Mínimo 8 caracteres"
                        value={novaSenha}
                        onChange={(e) => setNovaSenha(e.target.value)}
                        disabled={!isEditing}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmar-senha">Confirmar nova senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="confirmar-senha"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Repita a nova senha"
                        value={confirmarSenha}
                        onChange={(e) => setConfirmarSenha(e.target.value)}
                        disabled={!isEditing}
                        className={`pl-10 ${isEditing && confirmarSenha && novaSenha !== confirmarSenha ? "border-destructive" : ""}`}
                      />
                    </div>
                    {isEditing && confirmarSenha && novaSenha !== confirmarSenha && (
                      <p className="text-xs text-destructive">As senhas não coincidem</p>
                    )}
                  </div>
                  {isEditing && (
                    <p className="text-xs text-muted-foreground sm:col-span-2">Deixe em branco para manter a senha atual</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Seu Plano</CardTitle>
              <CardDescription>Detalhes da sua assinatura</CardDescription>
            </CardHeader>
            <CardContent>
              {plano === "free" ? (
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold text-foreground">Plano Grátis</span>
                      <Badge variant="secondary">Ativo</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">Até 10 questões por dia · Sem simulados</p>
                  </div>
                  <Button asChild>
                    <Link href="/#planos" className="gap-1.5">
                      Fazer upgrade <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-lg border border-primary bg-primary/5 p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold text-foreground">
                        {plano === "pro" ? "Plano Pro" : "Plano Aprovação"}
                      </span>
                      <Badge className="bg-primary">Ativo</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {plano === "pro" ? "Questões ilimitadas · Simulados completos · Tutor IA" : "Tudo do Pro · Tutor IA ilimitado · Resumos automáticos"}
                    </p>
                  </div>
                  {stripeCustomerId && (
                    <Button variant="outline" onClick={handlePortal} disabled={abrindoPortal} className="gap-1.5 shrink-0">
                      {abrindoPortal ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                      Gerenciar
                    </Button>
                  )}
                </div>
              )}
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {plano === "free"
                  ? [["10/dia", "Questões"], ["—", "Simulados"], ["Básico", "Plano de estudos"]].map(([v, l]) => (
                      <div key={l} className="rounded-lg border border-border p-4 text-center">
                        <p className="text-2xl font-bold text-muted-foreground">{v}</p>
                        <p className="text-xs text-muted-foreground">{l}</p>
                      </div>
                    ))
                  : [["Ilimitado", "Questões"], ["Ilimitado", "Simulados"], ["Dinâmico", "Plano de estudos"]].map(([v, l]) => (
                      <div key={l} className="rounded-lg border border-border p-4 text-center">
                        <p className="text-2xl font-bold text-primary">{v}</p>
                        <p className="text-xs text-muted-foreground">{l}</p>
                      </div>
                    ))
                }
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Suas Conquistas</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[
                { icon: Trophy, value: stats.simuladosFeitos, label: "Simulados realizados" },
                { icon: BookOpen, value: stats.questoesResolvidas.toLocaleString("pt-BR"), label: "Questões resolvidas" },
                { icon: Target, value: `${stats.taxaAcerto}%`, label: "Taxa de acerto geral" },
              ].map(({ icon: Icon, value, label }) => (
                <div key={label} className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Informações da Conta</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Membro desde</span>
                <span className="text-sm font-medium text-foreground">{dataCadastro}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant="secondary" className="bg-primary/10 text-primary">Ativo</Badge>
              </div>
              <Separator />
              <Button
                variant="ghost"
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setConfirmSair(true)}
              >
                Sair da conta
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmSair}
        onOpenChange={setConfirmSair}
        title="Sair da conta?"
        description="Você será redirecionado para a página de login."
        confirmLabel="Sair"
        onConfirm={async () => {
          const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          )
          await supabase.auth.signOut()
          window.location.href = "/login"
        }}
      />
    </div>
  )
}