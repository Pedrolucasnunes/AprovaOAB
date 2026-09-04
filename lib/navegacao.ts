// Qual item da barra lateral acende em cada tela.
//
// Mora aqui, e não dentro do componente, porque é regra de rota com duas
// armadilhas que não aparecem em revisão de código — e função pura é a única
// coisa deste arquivo que dá pra testar sem navegador.

/**
 * O item acende na própria tela **e nas telas abaixo dela**.
 *
 * Era igualdade exata, e o efeito era que `/dashboard/simulados/<id>` — fazer a
 * prova e ver o resultado — deixava a barra inteira apagada: nenhum item aceso
 * justamente nas horas em que a pessoa está resolvendo o simulado.
 *
 * Duas armadilhas, as duas silenciosas:
 *
 * 1. **A home precisa continuar exigindo igualdade exata.** TODA URL do painel
 *    começa com `/dashboard`, então tratá-la por prefixo acenderia o Dashboard
 *    em todas as telas — dois itens acesos ao mesmo tempo, pior que nenhum.
 *
 * 2. **A comparação vai até a BARRA, não pelo prefixo cru.** Sem o `"/"`, um
 *    futuro `/dashboard/questoes-antigas` acenderia "Banco de Questões", e o
 *    sintoma (item errado aceso) não apontaria pra cá.
 */
export function itemAtivo(pathname: string, url: string): boolean {
  if (url === "/dashboard") return pathname === "/dashboard"
  return pathname === url || pathname.startsWith(url + "/")
}
