# Performance (Core Web Vitals) - 35/100 (peso 10%)

## O que funciona

- CLS = 0 em todas as paginas testadas - todas as imagens tem width/height
- Compressao Brotli ativa em todo JS e CSS
- TTFB de servidor em 60ms (Lighthouse: Root document took 60ms)
- JS proprio enxuto: 293 KB comprimidos em 15 chunks
- font-display correto - audit de webfont passa

## Achados

### [Critical] LCP de 9,5s a 12,3s no mobile, sendo 93-94% render delay

Home: LCP 12,3s (TTFB 694ms / render delay 11.622ms). /questoes/direito-civil: 9,5s (render delay 8.840ms). /provas/45-exame-oab: 12,0s (render delay 11.293ms). O elemento LCP e um paragrafo de texto, nao imagem. DESCARTADO: o gate de animacao no above-the-fold ja esta resolvido - hero.tsx usa initial={false} e o paragrafo do LCP chega em opacity:1;transform:none; os 24 elementos em opacity:0 sao os <Reveal> com whileInView abaixo da dobra. CAUSA REAL: saturacao de main thread - 15 dos 19 componentes em components/site sao 'use client' e a home monta 13 secoes, arrastando motion/react para a hidratacao inicial, somados a 301 KB de GTM + Clarity. Main thread: 1.508ms de script evaluation e 1.244ms de style & layout.

**Correcao:** Nesta ordem, re-medindo a cada passo: (1) tirar Clarity e GTM do caminho critico; (2) tirar motion/react da hidratacao inicial comecando por components/site/reveal.tsx - 21 usos em 8 secoes, scroll-reveal puro que CSS resolve com @keyframes + animation-timeline: view() e animation-fill-mode: both, ou um IntersectionObserver minimo; (3) revisar quais das 15 secoes precisam mesmo ser client components. Respeitar prefers-reduced-motion entregando o estado final.

### [High] 301 KB de tags de terceiros na thread principal

GTM (GTM-TJMVZGH2) + gtag direto (G-9X6ZNVDJ10) + Clarity + Bing UET rodando em paralelo. GTM: 301 KB transferidos, 291ms de main thread, 156ms de blocking, 141 KB de JS nao utilizado (43-53%). Clarity: 890ms de main thread - mais que todo o JS da aplicacao. TBT de 190-310ms.

**Correcao:** Consolidar GA4 dentro do GTM removendo o gtag duplicado; carregar Clarity com strategy lazyOnload; reavaliar ROI do Bing UET.

### [Medium] Sem preconnect para 7 origens de terceiros

Desperdicio medido: r.clarity.ms 560ms, www.clarity.ms 413ms, googletagmanager.com 405ms, google-analytics.com 382ms, c.clarity.ms 371ms, c.bing.com 371ms, scripts.clarity.ms 371ms.

**Correcao:** Adicionar link rel=preconnect para as origens criticas.

### [Medium] 6 arquivos de fonte com preload, 148 KB

Quatro familias: Geist, Geist Mono, Fraunces, DM Mono. Todas com preload, competindo por banda no caminho critico.

**Correcao:** Preload apenas das faces usadas above-the-fold; reduzir o numero de familias.

### [Medium] CSS bloqueante de 28,7 KB

/_next/static/chunks/3a1b62653397792f.css bloqueia a renderizacao por 300ms.

**Correcao:** Inline do CSS critico e carregamento assincrono do restante.
