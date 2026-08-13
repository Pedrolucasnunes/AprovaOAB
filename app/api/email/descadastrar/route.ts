import { NextRequest, NextResponse } from "next/server"
import { verificarToken } from "@/lib/email-optout"
import { logError } from "@/lib/logger"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = "force-dynamic"

// Descadastro de e-mails de marketing/reengajamento.
//
// Rota PÚBLICA e sem sessão de propósito: o token é a credencial. Exigir login
// pra sair de uma lista é o padrão escuro clássico — e não funcionaria, porque
// boa parte de quem quer sair não lembra que tem conta.
//
// ─────────────────────────────────────────────────────────────────────────────
// POR QUE O GET NÃO DESCADASTRA
//
// Filtro de segurança de e-mail corporativo (Outlook/Defender, Proofpoint,
// Barracuda) faz GET em todo link da mensagem pra checar se é malicioso, antes
// de a pessoa ver o e-mail. Se o GET aplicasse o opt-out, o antivírus do
// destinatário descadastraria ele sozinho — e o sintoma seria "meus e-mails
// param de chegar pra empresas grandes", que ninguém liga a esta rota.
//
// Então: GET mostra uma confirmação, POST aplica. Isso também é exatamente o
// que a RFC 8058 (one-click) pede — o cliente de e-mail manda POST com corpo
// `List-Unsubscribe=One-Click`, e o botão nativo do Gmail funciona sem ninguém
// abrir o navegador.
// ─────────────────────────────────────────────────────────────────────────────

function pagina(titulo: string, corpo: string, status = 200): NextResponse {
  // HTML autocontido, sem o shell do app: a pessoa chega deslogada, vinda de um
  // e-mail, e a página não pode depender de nada que exija sessão ou JS.
  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${titulo} — AprovaOAB</title>
<style>
  :root { color-scheme: dark }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         background:#0b0f17; color:#e6edf3; font:16px/1.6 system-ui,-apple-system,Segoe UI,sans-serif; padding:24px }
  .card { max-width:34rem; width:100%; background:#111826; border:1px solid #1f2937; border-radius:16px; padding:32px }
  h1 { margin:0 0 12px; font-size:20px }
  p { margin:0 0 16px; color:#9aa7b8 }
  button { cursor:pointer; font:inherit; font-weight:600; border:0; border-radius:10px;
           background:#22c55e; color:#052e16; padding:12px 20px }
  a { color:#22c55e }
</style>
</head>
<body><div class="card">${corpo}</div></body>
</html>`
  return new NextResponse(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  })
}

/** Confirmação. Não muda nada — ver o bloco acima. */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")
  if (!verificarToken(token)) {
    return pagina(
      "Link inválido",
      // Nada de "é só responder": oi@aprovaoab.app.br só ENVIA (o domínio não
      // tem MX). Todo caminho oferecido aqui tem que ser um que funcione.
      `<h1>Esse link não vale mais</h1>
       <p>Ele pode ter sido copiado pela metade — tente abrir de novo direto pelo
       e-mail. Se não der, use o link de descadastro de qualquer mensagem mais
       recente.</p>`,
      400,
    )
  }

  return pagina(
    "Confirmar descadastro",
    `<h1>Quer parar de receber nossos e-mails?</h1>
     <p>Você deixa de receber a newsletter e os demais e-mails de estudo. E-mails
     da sua conta — código de acesso e cobrança — continuam chegando.</p>
     <form method="POST">
       <input type="hidden" name="List-Unsubscribe" value="One-Click">
       <button type="submit">Confirmar descadastro</button>
     </form>`,
  )
}

/** Aplica o opt-out. Serve o botão acima E o one-click do cliente de e-mail. */
export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")
  const userId = verificarToken(token)

  if (!userId) {
    return NextResponse.json({ error: "Token inválido" }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from("users")
    .update({ email_optout_at: new Date().toISOString() })
    .eq("id", userId)

  if (error) {
    logError(error, { area: "email-optout", phase: "update", userId })
    return NextResponse.json({ error: "Falha ao processar" }, { status: 500 })
  }

  // Cliente de e-mail (one-click) quer status, não página. Só o navegador, que
  // manda Accept com text/html, recebe HTML.
  const querHtml = (req.headers.get("accept") ?? "").includes("text/html")
  if (!querHtml) return NextResponse.json({ ok: true })

  return pagina(
    "Pronto",
    `<h1>Pronto, você saiu</h1>
     <p>Não vamos mais mandar newsletter nem e-mails de estudo pra você. Sua conta
     e seu progresso continuam intactos, e os e-mails de código de acesso e de
     cobrança seguem chegando.</p>
     <p><a href="https://www.aprovaoab.app.br">Voltar ao site</a></p>`,
  )
}
