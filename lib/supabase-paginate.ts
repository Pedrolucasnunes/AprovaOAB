// Helpers para contornar o teto de 1000 linhas por requisição do PostgREST (Supabase).
//
// Qualquer .select() que espera trazer "tudo" de uma tabela grande sofre o cap: vêm
// só as primeiras 1000 linhas. Estes helpers paginam de forma segura. São agnósticos
// de cliente — funcionam com o `supabase` (browser) e com o `supabaseAdmin` (server).
//
// Padrão da query builder do supabase-js: ela é "de uso único" (await a executa). Por
// isso os helpers recebem uma *factory* que devolve uma query nova a cada chamada.

type QueryResult<T> = PromiseLike<{ data: T[] | null; error: unknown }>
type RangeableQuery<T> = { range: (from: number, to: number) => QueryResult<T> }

const PAGE_SIZE = 1000
// .in(...) e .not(...,in,...) vão na query string (GET). Lotes menores evitam estourar
// o tamanho de URL com muitos UUIDs.
const IN_CHUNK = 300

// Pagina um select via .range() em blocos até vir uma página curta (fim dos dados).
export async function fetchAllRows<T>(
  makeQuery: () => RangeableQuery<T>,
  chunkSize: number = PAGE_SIZE,
): Promise<T[]> {
  const all: T[] = []
  for (let from = 0; ; from += chunkSize) {
    const { data, error } = await makeQuery().range(from, from + chunkSize - 1)
    if (error) throw error
    const rows = (data ?? []) as T[]
    all.push(...rows)
    if (rows.length < chunkSize) break
  }
  return all
}

// Divide um array em pedaços de no máximo `size`.
export function chunk<T>(arr: T[], size: number = IN_CHUNK): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

// Executa um filtro .in(...) em lotes (para listas de ids que podem passar do teto /
// estourar a URL) e concatena os resultados.
export async function fetchByIds<T>(
  makeQuery: (ids: string[]) => QueryResult<T>,
  ids: string[],
  chunkSize: number = IN_CHUNK,
): Promise<T[]> {
  if (ids.length === 0) return []
  const out: T[] = []
  for (const part of chunk(ids, chunkSize)) {
    const { data, error } = await makeQuery(part)
    if (error) throw error
    out.push(...((data ?? []) as T[]))
  }
  return out
}
