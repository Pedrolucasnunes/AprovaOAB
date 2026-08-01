// Fonte única do preço exibido. Client-safe: sem imports de servidor.
//
// Antes disto o valor estava escrito à mão em quatro lugares (vitrine, FAQ,
// tela do trial e perfil). Preço repetido é preço que diverge — e este vai
// mudar. A parede do limite diário, de propósito, NÃO cita preço nenhum: assim
// ela sobrevive à mudança sem edição.
//
// Isto é a copy, não a cobrança. Quem cobra é a Stripe (`STRIPE_PRICE_PRO`);
// se os dois divergirem, a Stripe está certa e este arquivo está desatualizado.

export const PRECO_PRO_CENTAVOS = 1900

/** "R$ 19" quando não há centavos, "R$ 19,90" quando há. */
export function formatarBRL(centavos: number): string {
  const reais = Math.floor(centavos / 100)
  const resto = centavos % 100
  return resto === 0
    ? `R$ ${reais}`
    : `R$ ${reais},${String(resto).padStart(2, "0")}`
}

export const PRECO_PRO = formatarBRL(PRECO_PRO_CENTAVOS)

/**
 * Preço anterior riscado. `null` porque **R$ 29 nunca foi cobrado de ninguém**
 * — era preço de tabela, e exibi-lo riscado ao lado de R$ 19 é âncora
 * inventada, não desconto. Se um dia houver aumento real, o valor antigo entra
 * aqui junto com `PROMOCAO_ATE`.
 */
export const PRECO_PRO_ANTERIOR: string | null = null

/**
 * Até quando vale a promoção, em texto exibível. `null` = não há promoção
 * declarada. Promoção sem data de fim é promessa que não se pode cobrar, e era
 * o que a vitrine dizia ("Preço promocional de lançamento", sem prazo).
 */
export const PROMOCAO_ATE: string | null = null
