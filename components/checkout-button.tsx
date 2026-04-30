"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"

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
      router.push("/login?redirect=/#planos")
      return
    }

    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plano }),
    })

    const { url } = await res.json()
    if (url) {
      window.location.href = url
    } else {
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
