# Images - 60/100 (peso 5%)

## O que funciona

- Zero imagens sem alt em todas as 12 paginas inspecionadas
- Todas com width/height declarados - CLS = 0
- Banner do Cafe com OAB em WebP (21 KB)
- OG images geradas dinamicamente pelo Next.js (124 KB, 1200x630)

## Achados

### [High] Favicons de 726 KB cada

/icon.png e /apple-icon.png pesam 726 KB cada, declarados como sizes=1024x1024. Sao 1,45 MB baixados apenas para desenhar um favicon de 32px.

**Correcao:** Gerar variantes 32x32 e 180x180 no App Router (app/icon.png e app/apple-icon.png).

### [Medium] Logo do schema com 253 KB

/aprovaoab-logo-primary.png, usado na propriedade logo do Organization, tem 253 KB.

**Correcao:** Otimizar para menos de 40 KB.

### [Medium] Nome de arquivo com espaco

A logo do header usa /Sem fundo.png, servido como /Sem%20fundo.png. O Lighthouse ainda aponta 'Properly size images' nele.

**Correcao:** Renomear para /logo-aprovaoab.png e servir no tamanho exibido.

### [Low] Alt redundante na logo

A logo tem alt='AprovaOAB' ao lado do texto 'AprovaOAB' - Lighthouse sinaliza image-redundant-alt.

**Correcao:** Usar alt vazio quando a imagem e decorativa e o texto ja esta presente.
