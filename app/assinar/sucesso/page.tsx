"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { CheckCircle, ArrowRight } from "lucide-react"

export default function AssinaturaSuccessPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border text-center">
        <CardHeader className="space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            Assinatura confirmada!
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Bem-vindo ao plano Pro. Seu acesso completo já está ativo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button asChild className="w-full gap-2">
            <Link href="/dashboard">
              Ir para o dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/dashboard">Ver meu plano de estudos</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
