"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
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
} from "lucide-react"
import { whatsappSupportUrl } from "@/lib/support"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Simulados", url: "/dashboard/simulados", icon: FileText },
  { title: "Banco de Questões", url: "/dashboard/questoes", icon: Database },
  { title: "Treino Estratégico", url: "/dashboard/treino", icon: Dumbbell },
  { title: "Desempenho",        url: "/dashboard/desempenho",  icon: BarChart3 },
  { title: "Agenda Inteligente", url: "/dashboard/calendario", icon: CalendarDays },
  { title: "Perfil",            url: "/dashboard/perfil",      icon: User },
]

interface UserInfo {
  nome: string
  email: string
  iniciais: string
}

export function AppSidebar() {
  const pathname = usePathname()

  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const email = user.email ?? ""

      // Prioridade: metadata.nome → metadata.full_name → prefixo do email formatado
      const nomeRaw =
        user.user_metadata?.nome ||
        user.user_metadata?.full_name ||
        email.split("@")[0]

      // Formata prefixo de email: "pedrolucasnunes2011" → "Pedrolucasnunes2011"
      const nome = nomeRaw.charAt(0).toUpperCase() + nomeRaw.slice(1)

      const partes = nome.trim().split(" ")
      const iniciais = partes.length >= 2
        ? `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase()
        : nome.slice(0, 2).toUpperCase()

      setUserInfo({ nome, email, iniciais })
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
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="h-12 cursor-pointer transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent">
                  <Avatar className="h-8 w-8">
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