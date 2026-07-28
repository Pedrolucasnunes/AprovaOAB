// Leitura da configuração de runtime (tabela `app_config`), validada e cacheada
// por request. Server-only: `app_config` tem RLS ligado sem policies, então só
// o supabaseAdmin alcança.
//
// Regra desta camada: NUNCA lançar. Config quebrada tem que degradar pra um
// padrão sensato, não derrubar o diagnóstico. Toda queda pro padrão é logada.
import { cache } from "react"
import { z } from "zod"
import { logWarning } from "./logger"
import { supabaseAdmin } from "./supabase-admin"

const moduloSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  questoesPorMateria: z.number().int().positive(),
  subjects: z.array(z.string().uuid()).min(1),
  dificuldades: z.array(z.string().min(1)).min(1),
})

const diagnosticoSchema = z.object({
  modulos: z.array(moduloSchema).min(1),
  exigirExplicacao: z.boolean(),
  minTempoRespostaMs: z.number().int().min(0),
  janelaEdicoes: z.number().int().positive(),
})

const limitesSchema = z.object({
  freeDailyLimit: z.number().int().positive(),
})

export type ModuloDiagnostico = z.infer<typeof moduloSchema>
export type DiagnosticoConfig = z.infer<typeof diagnosticoSchema>
export type LimitesConfig = z.infer<typeof limitesSchema>

/**
 * Fallback do Módulo 1 por NOME, não por UUID.
 *
 * Se a linha de config sumir ou vier corrompida, resolvemos os ids consultando
 * `subjects`. Guardar UUID hardcoded aqui seria pior de duas formas: quebra em
 * qualquer ambiente com outro seed, e reintroduz exatamente o acoplamento que
 * o guard da migration existe pra evitar.
 *
 * Os nomes têm que bater EXATAMENTE com `subjects.name` — "Ética" não casa com
 * nada, o registro é "Ética Profissional".
 */
const M1_NOMES = [
  "Ética Profissional",
  "Direito Penal",
  "Direito Constitucional",
  "Direito Civil",
  "Processo Civil",
  "Processo do Trabalho",
  "Processo Penal",
  "Direito Administrativo",
] as const

const PADRAO_ESCALARES = {
  exigirExplicacao: true,
  minTempoRespostaMs: 3000,
  janelaEdicoes: 9,
} as const

const PADRAO_LIMITES: LimitesConfig = { freeDailyLimit: 10 }

async function lerChave(key: string): Promise<unknown | null> {
  const { data, error } = await supabaseAdmin
    .from("app_config")
    .select("value")
    .eq("key", key)
    .maybeSingle()

  if (error) {
    logWarning("Falha lendo app_config — usando padrão", { area: "config", key, erro: error.message })
    return null
  }
  return data?.value ?? null
}

/** Reconstrói os módulos a partir de `subjects` quando a config não serve. */
async function modulosPorNome(): Promise<ModuloDiagnostico[]> {
  const { data, error } = await supabaseAdmin.from("subjects").select("id, name")
  if (error || !data) {
    logWarning("Não consegui montar módulos pelo nome", { area: "config", erro: error?.message })
    return []
  }

  const idPorNome = new Map(data.map((s) => [s.name as string, s.id as string]))
  const m1 = M1_NOMES.map((n) => idPorNome.get(n)).filter((id): id is string => Boolean(id))

  if (m1.length !== M1_NOMES.length) {
    logWarning("Nem toda matéria do Módulo 1 resolveu por nome", {
      area: "config",
      esperado: M1_NOMES.length,
      resolvido: m1.length,
    })
  }
  if (m1.length === 0) return []

  const m1Set = new Set(m1)
  const m2 = data.map((s) => s.id as string).filter((id) => !m1Set.has(id))

  const modulos: ModuloDiagnostico[] = [
    { id: "m1", label: "Módulo 1", questoesPorMateria: 2, subjects: m1, dificuldades: ["medio", "dificil"] },
  ]
  if (m2.length > 0) {
    modulos.push({ id: "m2", label: "Módulo 2", questoesPorMateria: 1, subjects: m2, dificuldades: ["medio"] })
  }
  return modulos
}

/**
 * Config do diagnóstico. `cache()` deduplica dentro do mesmo request — várias
 * chamadas na mesma rota batem no banco uma vez só.
 */
export const getDiagnosticoConfig = cache(async (): Promise<DiagnosticoConfig> => {
  const bruto = await lerChave("diagnostico")
  const parsed = diagnosticoSchema.safeParse(bruto)

  if (parsed.success) return parsed.data

  logWarning("Config `diagnostico` ausente ou inválida — reconstruindo por nome", {
    area: "config",
    problema: bruto === null ? "linha ausente" : parsed.error.issues.map((i) => i.path.join(".")).join(", "),
  })

  return { modulos: await modulosPorNome(), ...PADRAO_ESCALARES }
})

export const getLimitesConfig = cache(async (): Promise<LimitesConfig> => {
  const parsed = limitesSchema.safeParse(await lerChave("limites"))
  if (parsed.success) return parsed.data
  return PADRAO_LIMITES
})

/** Módulo pelo id (`"m1"`, `"m2"`), ou null se não existir na config. */
export async function getModulo(id: string): Promise<ModuloDiagnostico | null> {
  const { modulos } = await getDiagnosticoConfig()
  return modulos.find((m) => m.id === id) ?? null
}

/** Quantas questões o módulo tem no total — o tamanho da sessão. */
export function tamanhoDoModulo(m: ModuloDiagnostico): number {
  return m.subjects.length * m.questoesPorMateria
}
