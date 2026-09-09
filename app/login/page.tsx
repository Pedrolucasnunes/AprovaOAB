import { Suspense } from "react"

import { AuthShell } from "@/components/auth/auth-shell"
import { LoginForm } from "@/components/auth/login-form"

/**
 * Renderiza a cada requisição, e isso NÃO é detalhe de performance.
 *
 * Sem esta linha o Next prerenderiza a página no build (`○ Static`) — e a
 * contagem regressiva do painel, que é calculada no servidor, seria assada
 * junto: "Faltam 123 dias" ficaria congelado no HTML até alguém publicar de
 * novo. O contador andaria só quando houvesse deploy, o que é pior que não
 * ter contador, porque parece certo.
 *
 * O custo é uma renderização sem I/O nenhum: `EDITAIS` é dado estático em
 * memória e o formulário é client. Não há consulta ao banco nesta rota.
 */
export const dynamic = "force-dynamic"

/**
 * Server Component fino de propósito: é o que permite ao painel da casca
 * calcular a contagem regressiva no servidor. Todo o estado da tela mora em
 * `LoginForm`, que continua client.
 *
 * O `Suspense` é exigência do `useSearchParams` lá dentro e veio junto do
 * arquivo antigo — sem ele o build reclama de rota inteira virando dinâmica.
 */
export default function LoginPage() {
  return (
    <AuthShell>
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  )
}
