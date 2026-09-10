import { AuthShell } from "@/components/auth/auth-shell"
import { CadastroForm } from "@/components/auth/cadastro-form"

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
 * Ver o comentário em `app/login/page.tsx` — mesma divisão servidor/cliente.
 *
 * `?email=` chega do formulário da newsletter na landing, que é um
 * `<form method="get">` nativo apontando pra cá. Sem isso a pessoa digitaria o
 * mesmo endereço duas vezes. É só valor inicial de um campo que ela pode
 * editar: nada é gravado, e endereço malformado cai na validação normal do
 * `type="email"`.
 */
export default async function CadastroPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>
}) {
  const { email } = await searchParams

  return (
    <AuthShell>
      <CadastroForm emailInicial={typeof email === "string" ? email : ""} />
    </AuthShell>
  )
}
