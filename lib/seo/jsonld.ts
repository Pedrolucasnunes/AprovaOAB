// Construtores de JSON-LD — puros, sem I/O.
//
// Existem porque o literal de schema.org estava sendo reescrito à mão em cada
// página (breadcrumb de questão, de edital…), e literal repetido diverge: um
// ganha `@context`, outro esquece, um usa caminho relativo onde o Google exige
// absoluto. A injeção continua sendo o <JsonLd> de components/seo/json-ld.tsx.
//
// Caminhos entram SEMPRE relativos ("/questoes"); o absoluto é montado aqui com
// APP_URL, porque `item` e `url` de schema.org não aceitam caminho relativo.
import { APP_URL } from "@/lib/app-url"

export type NoDeLista = { name: string; path: string }

const abs = (path: string) => `${APP_URL}${path}`

/** Trilha da raiz até a página atual, na ordem. */
export function breadcrumb(trilha: NoDeLista[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trilha.map((no, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: no.name,
      item: abs(no.path),
    })),
  }
}

/** Lista ordenada de links da página (matérias de um hub, questões de uma matéria). */
export function itemList(nome: string, itens: NoDeLista[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: nome,
    numberOfItems: itens.length,
    itemListElement: itens.map((no, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: no.name,
      url: abs(no.path),
    })),
  }
}

/** Página que é uma coleção de outras (hubs e páginas de matéria). */
export function collectionPage({
  name,
  description,
  path,
}: {
  name: string
  description: string
  path: string
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: abs(path),
    inLanguage: "pt-BR",
  }
}
