import { NextResponse } from "next/server"
import { getDiagnosticoConfig } from "@/lib/config"
import { sendDiagnosticoLembreteEmail } from "@/lib/email"
import { EVENTOS, track } from "@/lib/events"
import { coberturaDeSubjects } from "@/lib/exames"
import { logError, logWarning } from "@/lib/logger"
import { proximoModuloPendente, subjectsMedidos } from "@/lib/services/diagnostico"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = "force-dynamic"

// Cron diário do lembrete do Módulo 2 (configurado em vercel.json).
//
// Só alcança quem PEDIU: `diagnostic_reminder_at` é escrito exclusivamente pelo
// botão "Me lembra amanhã". Não é campanha, é uma promessa sendo cumprida.
//
// Protegido por CRON_SECRET, mesmo padrão de /api/cron/newsletter: a Vercel
// manda "Authorization: Bearer <CRON_SECRET>" quando a env var existe.
//
// A coluna é limpa DEPOIS da tentativa de envio, com ou sem sucesso. "Me lembra
// amanhã" pediu um lembrete, não uma sequência — e sem a limpeza uma falha de
// envio viraria e-mail diário até dar certo.

const MAX_POR_EXECUCAO = 200

async function handle(req: Request) {
  const authHeader = req.headers.get("authorization")
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const { data: devidos, error } = await supabaseAdmin
      .from("users")
      .select("id, diagnostic_reminder_at")
      .not("diagnostic_reminder_at", "is", null)
      .lte("diagnostic_reminder_at", new Date().toISOString())
      .order("diagnostic_reminder_at", { ascending: true })
      .limit(MAX_POR_EXECUCAO)

    if (error) throw error
    if (!devidos || devidos.length === 0) {
      return NextResponse.json({ ok: true, devidos: 0, enviados: 0 })
    }

    const { janelaEdicoes } = await getDiagnosticoConfig()

    // Total de matérias do banco — o denominador do "mapa completo". Lido uma
    // vez por execução, não por usuário.
    const { count: totalSubjectsCount } = await supabaseAdmin
      .from("subjects")
      .select("id", { count: "exact", head: true })
    const totalSubjects = totalSubjectsCount ?? 0

    let enviados = 0
    let semPendencia = 0
    let semEmail = 0

    for (const linha of devidos) {
      const userId = linha.id as string

      // O mapa pode ter sido completado entre o pedido e agora. Mandar
      // "faltam 0 matérias" seria pior do que não mandar nada.
      const proximo = await proximoModuloPendente(userId)
      if (!proximo) {
        semPendencia += 1
        await limpar(userId)
        continue
      }

      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId)
      const email = authUser?.user?.email
      if (!email) {
        semEmail += 1
        await limpar(userId)
        continue
      }

      const medidos = [...(await subjectsMedidos(userId))]
      const cobertura = await coberturaDeSubjects(medidos, janelaEdicoes)
      const fullName = (authUser.user?.user_metadata?.full_name as string | undefined) ?? ""

      // Duas contagens diferentes, e o e-mail precisa das duas: o módulo cobre
      // parte do que falta, não tudo. Antes ele dizia "faltam 6 pro mapa ficar
      // completo" usando o número do módulo, quando faltavam 18 no mapa.
      await sendDiagnosticoLembreteEmail({
        toEmail: email,
        firstName: fullName.trim().split(/\s+/)[0] || null,
        modulo: {
          label: proximo.label,
          questoes: proximo.questoes,
          materiasPendentes: proximo.materiasPendentes,
        },
        materiasMedidas: medidos.length,
        materiasNaoMedidas: Math.max(totalSubjects - medidos.length, 0),
        coberturaPercentual: Math.round(cobertura.percentual),
      })

      await limpar(userId)
      enviados += 1
      void track(userId, EVENTOS.DIAGNOSTICO_LEMBRETE_ENVIADO, { modulo: proximo.id })
    }

    return NextResponse.json({
      ok: true,
      devidos: devidos.length,
      enviados,
      semPendencia,
      semEmail,
    })
  } catch (err) {
    logError(err, { area: "diagnostico-lembrete", phase: "cron" })
    return NextResponse.json({ error: "Falha no cron do lembrete" }, { status: 500 })
  }
}

/** Zera o agendamento — o lembrete é único por pedido. */
async function limpar(userId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("users")
    .update({ diagnostic_reminder_at: null })
    .eq("id", userId)

  // Logado, não propagado: se a limpeza falhar o usuário recebe o lembrete de
  // novo amanhã, o que é ruim mas não justifica abortar os outros envios.
  if (error) {
    logWarning("Falha limpando diagnostic_reminder_at", {
      area: "diagnostico-lembrete",
      userId,
      erro: error.message,
    })
  }
}

export const GET = handle
export const POST = handle
