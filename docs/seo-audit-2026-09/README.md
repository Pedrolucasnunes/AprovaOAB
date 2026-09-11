# Auditoria SEO — setembro/2026

Auditoria completa de `https://www.aprovaoab.app.br/` feita em 11/09/2026.
**SEO Health Score: 68/100** · 37 achados em 8 categorias.

## O que tem aqui

| Arquivo | Para quê |
|---|---|
| `ACTION-PLAN.md` | **Comece por aqui.** Priorizado por impacto ÷ esforço, em 4 fases. |
| `FULL-AUDIT-REPORT.md` | Relatório completo com a evidência por trás de cada achado. |
| `findings/*.md` | Um arquivo por categoria, para ler só a parte que interessa. |
| `audit-data.json` | Mesma coisa em formato estruturado, para gerar relatório ou diff futuro. |

O resumo operacional — o que não pode ser quebrado e o que está aberto — está na seção **SEO** do `CLAUDE.md` da raiz, que é o que uma sessão de Claude Code carrega automaticamente.

## Comece por aqui

**Bug em produção, 10 minutos:** com `prefers-reduced-motion` ligado, os 24 blocos `<Reveal>` ficam permanentemente em `opacity:0` — a landing mostra o herói e mais nada. Item 1.0 do `ACTION-PLAN.md`. Não é SEO, e não deve esperar pelo resto.

## Os dois problemas de busca

1. **LCP mobile de 9,5s a 12,3s**, 93–94% render delay, por saturação de main thread — não por gate de animação, que já está resolvido no `hero.tsx`. Ver `findings/performance.md`.
2. **200 de ~2.240 questões têm URL indexável.** Cerca de 91% do acervo é invisível para a busca. Ver `findings/content.md`.

## Escopo e limitações

Coletado: headers HTTP, HTML servido de 12 páginas, sitemap completo (253 URLs), robots.txt, amostra aleatória de 14 páginas de questão, peso de todos os assets da home, 3 execuções de Lighthouse.

Rodou **sem** dados de campo (CrUX), Search Console, GA4 e perfil de backlinks — nenhuma credencial configurada na época, e a quota pública da API do PageSpeed estava esgotada. **Os números de performance são de laboratório, não de campo.**

## Reproduzir as medições

```bash
# Lighthouse mobile (o que gerou os números de performance)
npx lighthouse@12 https://www.aprovaoab.app.br/ \
  --only-categories=performance,seo,accessibility,best-practices \
  --form-factor=mobile --screenEmulation.mobile \
  --output=html --output-path=./lh.html

# Cobertura do sitemap
curl -s https://www.aprovaoab.app.br/sitemap.xml | grep -c '<loc>'

# Metadata de uma rota
curl -s https://www.aprovaoab.app.br/login | grep -o '<meta name="robots"[^>]*>'
```
