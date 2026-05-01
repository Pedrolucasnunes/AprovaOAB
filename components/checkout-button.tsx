"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"
import { toast } from "sonner"

interface CheckoutButtonProps {
  plano: "pro" | "aprovacao"
  className?: string
  variant?: "default" | "outline"
  children: React.ReactNode
}

export function CheckoutButton({ plano, className, variant = "default", children }: CheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleClick = async () => {
    setIsLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push("/cadastro?redirect=/#planos")
      return
    }

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plano }),
      })

      const text = await res.text()
      const data = text ? JSON.parse(text) : {}

      if (res.ok && data.url) {
        window.location.href = data.url
        return
      }

      toast.error(data.error ?? "Não foi possível iniciar o checkout. Tente novamente em instantes.")
      setIsLoading(false)
    } catch (err) {
      console.error("[checkout] erro:", err)
      toast.error("Falha de rede ao iniciar o checkout. Verifique sua conexão.")
      setIsLoading(false)
    }
  }

  return (
    <Button
      size="lg"
      variant={variant}
      onClick={handleClick}
      disabled={isLoading}
      className={`w-full gap-2 py-6 text-base font-semibold ${className ?? ""}`}
    >
      {isLoading ? "Redirecionando..." : children}
      {!isLoading && <ArrowRight className="h-4 w-4" />}
    </Button>
  )
}
