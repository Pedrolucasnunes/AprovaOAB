// Utilitários de slug para as páginas públicas de SEO.
// Sem dependência externa — normaliza acentos do PT-BR para ascii.

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "") // remove acentos (combining marks)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function subjectSlug(name: string): string {
  return slugify(name)
}

/** O mínimo para montar o slug de uma questão. */
export type SlugDeQuestao = {
  id: string
  topicName?: string | null
  /** Edição do Exame de Ordem em arábico (45). Vem de `edicaoDaBanca`. */
  edicao?: number | null
  /** Só usado no fallback — ver abaixo. */
  enunciado?: string
}

/**
 * Slug da questão: tema + exame + uuid completo no fim (garante unicidade).
 * Ex.: "responsabilidade-civil-do-estado-36-exame-oab-<uuid>"
 *
 * O prefixo saía do `enunciado`, o que produzia URLs como
 * "jose-e-proprietario-de-imovel-rural-de-enorme-dimensao-mas-t-<uuid>": o enredo
 * do caso, sem uma palavra que alguém busque. Tópico + edição é o que a pessoa
 * digita ("responsabilidade civil do estado oab", "36 exame oab").
 *
 * PURA e idempotente de propósito: é ela que decide a URL canônica, e a página
 * compara o slug pedido com o que esta função devolve para emitir 301. Função
 * instável aqui vira laço de redirecionamento.
 *
 * O fallback pelo enunciado só existe para questão sem tópico nem banca — hoje
 * nenhuma (verificado ago/2026: 100% têm topic_id e banca), mas o dado é editável
 * no admin e um slug vazio quebraria a rota.
 */
export function questionSlug(q: SlugDeQuestao): string {
  const partes = [
    q.topicName ? slugify(q.topicName) : "",
    q.edicao ? `${q.edicao}-exame-oab` : "",
  ].filter(Boolean)

  const base =
    partes.length > 0
      ? partes.join("-")
      : slugify(q.enunciado ?? "").slice(0, 60).replace(/-+$/g, "")

  return base ? `${base}-${q.id}` : q.id
}

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Extrai o uuid do fim do slug. Resolve a questão sempre pelo id.
export function parseQuestionId(slug: string): string | null {
  const m = slug.match(UUID_RE)
  return m ? m[0].toLowerCase() : null
}
