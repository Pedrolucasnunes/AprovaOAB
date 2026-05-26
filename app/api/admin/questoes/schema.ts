import { z } from "zod"

export const questaoSchema = z.object({
  enunciado: z.string().min(1).max(5000),
  alternativa_a: z.string().min(1).max(2000),
  alternativa_b: z.string().min(1).max(2000),
  alternativa_c: z.string().min(1).max(2000),
  alternativa_d: z.string().min(1).max(2000),
  resposta_correta: z.enum(["A", "B", "C", "D"]),
  dificuldade: z.string().max(50).nullish(),
  banca: z.string().max(2000).nullish(),
  ano: z.coerce.number().int().min(1900).max(2100).nullish(),
  subject_id: z.string().min(1),
  topic_id: z.string().nullish(),
  explicacao: z.string().max(2000).nullish(),
  incidencia_prova: z.string().max(50).nullish(),
})

export type QuestaoInput = z.infer<typeof questaoSchema>
