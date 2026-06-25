// Server Component reutilizável para injetar JSON-LD (schema.org).
// Escapa `<` para que um texto contendo "</script>" não quebre a tag — mesmo
// padrão já usado na página de questão antes deste helper existir.
export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  )
}
