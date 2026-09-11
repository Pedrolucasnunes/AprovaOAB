# Accessibility & Best Practices - 55/100 (peso 0%)

## O que funciona

- Lighthouse SEO 100; Acessibilidade 96, mas a nota nao cobre o bug A0
- Carrossel de depoimentos com role=group, aria-roledescription=carrossel e aria-label

## Achados

### [Critical] BUG EM PRODUCAO: landing invisivel sob prefers-reduced-motion

Com movimento reduzido ligado, os 24 blocos <Reveal> ficam permanentemente em opacity:0 - a pagina mostra o heroi e mais nada. Medido em producao (Chrome headless, viewport 1400x6000): no modo normal 18 dos 24 sao revelados; com --force-prefers-reduced-motion, 0 de 24. Causa em components/site/reveal.tsx: o servidor nao le media query, entao useReducedMotion() devolve falso no SSR e o HTML sai com style='opacity:0;transform:translateY(26px)'; no cliente com reduce, initial={false} manda nao animar e whileInView={undefined} nao fornece alvo, entao nada desfaz o estilo inline. O Lighthouse deu 96 de acessibilidade porque nao executa a pagina sob essa media query.

**Correcao:** Correcao minima de 10 minutos mantendo o motion: whileInView={{opacity:1,y:0}} sempre definido (nunca undefined) e transition={reduce ? {duration:0} : {...}}. Some sozinho se a reescrita em CSS do item 1.1 for feita, porque o bloco @media (prefers-reduced-motion) forca o estado final.

### [Medium] Contraste abaixo do minimo WCAG AA em 2 elementos

Texto #8390a2 sobre #ffffff a 6,4pt = ratio 3,24. Link #059669 sobre #f8fafc a 10,5pt = ratio 3,6. O minimo AA e 4,5.

**Correcao:** Escurecer os dois tokens de cor ate atingir 4,5:1.

### [Medium] Sincronizacao de cookies de terceiros sem consentimento visivel

Clarity e Bing fazem sync de identificadores (c.bing.com/c.gif?ctsa=mr&CtsSyncId=...) sem banner de consentimento. Alem de quebrar com o fim dos cookies de terceiros, e exposicao sob a LGPD.

**Correcao:** Implementar Consent Mode v2 e carregar as tags apenas apos opt-in.
