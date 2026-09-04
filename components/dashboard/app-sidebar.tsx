"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { getClientUser } from "@/lib/auth-client"
import { fotoDoPerfil, iniciaisDoNome } from "@/lib/avatar"
import {
  LayoutDashboard,
  FileText,
  Database,
  Dumbbell,
  BarChart3,
  User,
  LogOut,
  CalendarDays,
  MessageCircle,
  ChevronsUpDown,
} from "lucide-react"
import { whatsappSupportUrl } from "@/lib/support"
import { itemAtivo } from "@/lib/navegacao"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"

interface ItemDeMenu {
  title: string
  url: string
  icon: typeof LayoutDashboard
}

/**
 * A home fica FORA de grupo de propósito: ela é o destino de volta de todas as
 * outras telas, não uma das coisas que se faz. Pendurá-la em "Estudo" a
 * rebaixaria a mais um item de uma lista.
 */
const inicio: ItemDeMenu = { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard }

/**
 * Agrupado por MODO DE USO, não por tipo de tela: primeiro onde se responde
 * questão, depois onde se olha o que saiu disso e se planeja a semana.
 *
 * O 2º grupo é "Progresso" e não "Análise" porque a Agenda olha pra FRENTE (o
 * que fazer) enquanto o Desempenho olha pra trás (o que aconteceu) — "Análise"
 * descreveria só metade dele.
 *
 * `Perfil` não está aqui de propósito: é o primeiro item do menu do rodapé,
 * mesmo link e mesmo ícone. Estava nos dois lugares ao mesmo tempo.
 */
const gruposDeMenu: { rotulo: string; itens: ItemDeMenu[] }[] = [
  {
    rotulo: "Estudo",
    itens: [
      { title: "Simulados", url: "/dashboard/simulados", icon: FileText },
      { title: "Banco de Questões", url: "/dashboard/questoes", icon: Database },
      { title: "Treino Estratégico", url: "/dashboard/treino", icon: Dumbbell },
    ],
  },
  {
    rotulo: "Progresso",
    itens: [
      { title: "Desempenho", url: "/dashboard/desempenho", icon: BarChart3 },
      { title: "Agenda Inteligente", url: "/dashboard/calendario", icon: CalendarDays },
    ],
  },
]

interface UserInfo {
  nome: string
  email: string
  iniciais: string
  /** Foto do login social; null para quem entrou por e-mail e senha. */
  foto: string | null
}

function ItemDeNavegacao({ item, ativo }: { item: ItemDeMenu; ativo: boolean }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={ativo} tooltip={item.title}>
        <Link href={item.url}>
          <item.icon className="h-4 w-4" />
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export function AppSidebar() {
  const pathname = usePathname()

  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)

  useEffect(() => {
    async function loadUser() {
      const user = await getClientUser()
      if (!user) return

      const email = user.email ?? ""

      // Prioridade: metadata.nome → metadata.full_name → prefixo do email formatado
      const nomeRaw =
        user.user_metadata?.nome ||
        user.user_metadata?.full_name ||
        email.split("@")[0]

      // Formata prefixo de email: "pedrolucasnunes2011" → "Pedrolucasnunes2011"
      const nome = nomeRaw.charAt(0).toUpperCase() + nomeRaw.slice(1)

      // 64px porque o avatar da barra tem 32 CSS px e a maioria das telas é 2x.
      setUserInfo({ nome, email, iniciais: iniciaisDoNome(nome), foto: fotoDoPerfil(user.user_metadata, 64) })
      setLoadingUser(false)
    }

    loadUser()
  }, [])

  async function handleSignOut() {
    try {
      await supabase.auth.signOut()
    } finally {
      window.location.href = "/login"
    }
  }

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="p-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <img src="/Sem fundo.png" alt="AprovaOAB" className="h-8 w-8 object-contain" />
          <span className="text-lg font-semibold group-data-[collapsible=icon]:hidden">
            <span className="text-primary">aprova</span><span className="text-foreground/70">OAB</span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <ItemDeNavegacao item={inicio} ativo={itemAtivo(pathname, inicio.url)} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {gruposDeMenu.map((grupo) => (
          <SidebarGroup key={grupo.rotulo}>
            {/* O rótulo se apaga sozinho no modo ícone — `SidebarGroupLabel` já
                traz `group-data-[collapsible=icon]:-mt-8 opacity-0`. O rail
                recolhido continua sendo só a coluna de ícones. */}
            <SidebarGroupLabel className="uppercase tracking-wide">
              {grupo.rotulo}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {grupo.itens.map((item) => (
                  <ItemDeNavegacao key={item.url} item={item} ativo={itemAtivo(pathname, item.url)} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="h-12 cursor-pointer transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent">
                  <Avatar className="h-8 w-8">
                    {userInfo?.foto && (
                      <AvatarImage
                        src={userInfo.foto}
                        alt={`Foto de ${userInfo.nome}`}
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {loadingUser ? "..." : userInfo?.iniciais}
                    </AvatarFallback>
                  </Avatar>

                  {/* Texto só aparece quando a sidebar está expandida */}
                  <div className="flex flex-col items-start group-data-[collapsible=icon]:hidden overflow-hidden">
                    {loadingUser ? (
                      <>
                        <Skeleton className="h-3.5 w-24 mb-1" />
                        <Skeleton className="h-3 w-32" />
                      </>
                    ) : (
                      <>
                        <span className="text-sm font-medium truncate max-w-[160px]">
                          {userInfo?.nome}
                        </span>
                        <span className="text-xs text-muted-foreground truncate max-w-[160px]">
                          {userInfo?.email}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Sem `Perfil` na navegação, este cartão vira o único caminho
                      pra tela de perfil. A seta é o que diz que ele abre menu. */}
                  <ChevronsUpDown className="ml-auto size-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>

              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/perfil" className="flex items-center gap-2 cursor-pointer">
                    <User className="h-4 w-4" />
                    Perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a
                    href={whatsappSupportUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <MessageCircle className="h-4 w-4 text-[#25D366]" />
                    Suporte via WhatsApp
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}