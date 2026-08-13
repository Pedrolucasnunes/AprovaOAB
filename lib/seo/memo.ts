// Memo de processo com TTL curto, para as leituras que o build repete.
//
// O prerender das páginas públicas roda centenas de vezes (252 rotas) e várias
// delas precisam exatamente das mesmas tabelas pequenas — o índice de edições, a
// tabela de tópicos, o conjunto de questões públicas. Sem isto é a mesma varredura
// uma vez por página.
//
// Não usa o `cache()` do React de propósito: aquele deduplica dentro de UM render,
// e aqui o ganho está justamente ENTRE renders diferentes do mesmo build.
//
// O TTL existe porque o mesmo módulo continua vivo no lambda em produção: sem ele,
// uma instância quente serviria o primeiro retrato para sempre. Curto o bastante
// para colapsar o build inteiro, e irrelevante sob ISR de 24h.
export function memo<T>(fn: () => Promise<T>, ttlMs = 60_000): () => Promise<T> {
  let cache: { at: number; valor: Promise<T> } | null = null
  return () => {
    const agora = Date.now()
    if (!cache || agora - cache.at > ttlMs) {
      const valor = fn()
      cache = { at: agora, valor }
      // Falha não pode ficar grudada no cache até o TTL vencer.
      valor.catch(() => {
        if (cache?.valor === valor) cache = null
      })
    }
    return cache.valor
  }
}
