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

// Slug da questão: texto legível + uuid completo no fim (garante unicidade).
// Ex.: "principio-da-legalidade-administrativa-<uuid>"
export function questionSlug(q: { id: string; enunciado: string }): string {
  const base = slugify(q.enunciado).slice(0, 60).replace(/-+$/g, "")
  return base ? `${base}-${q.id}` : q.id
}

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Extrai o uuid do fim do slug. Resolve a questão sempre pelo id.
export function parseQuestionId(slug: string): string | null {
  const m = slug.match(UUID_RE)
  return m ? m[0].toLowerCase() : null
}
