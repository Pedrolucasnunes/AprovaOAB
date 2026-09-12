# Medições de campo — Search Console

A auditoria de 11/09/2026 rodou **sem** Search Console (ver "Escopo e limitações"
no `README.md`). Os dados existiam desde 10/06/2026 e não tinham sido olhados: a
propriedade `sc-domain:aprovaoab.app.br` já estava verificada. Este arquivo é a
série de campo, que o relatório de laboratório não tem.

**Procedência:** números lidos por Pedro na interface do Search Console e
transcritos para a sessão. Esta sessão não tem OAuth do Search Console nem
`GOOGLE_API_KEY`, então não há como reexecutar a consulta daqui — o que está
aqui é transcrição, não coleta. Repetir a medição exige o mesmo relatório, na
mesma janela, exportado da mesma tela.

---

## Linha de base — 12/setembro/2026

Congelada de propósito, **antes** de qualquer mudança de description ou de malha
interna. Sem ela não há com o que comparar depois, e o retrato não se recupera.

### Indexação (relatório Páginas, lido em 11/09/2026)

| | |
|---|---:|
| Indexadas | **65** |
| Não indexadas | **206** |
| └ Detectada, mas não indexada no momento | **197** |
| └ Página com redirecionamento | 6 |
| └ Cópia, canônica diferente | 2 |
| └ Rastreada, mas não indexada no momento | **1** |

Sitemap: enviado 13/08/2026, lido 04/09/2026, status **Processado**, 252 páginas.
(O sitemap servido tinha 253 URLs em 11/09 e passou a 254 em 11/09 com
`/provas/47-exame-oab`.)

### Desempenho (últimos 3 meses, lido em 12/09/2026)

| | |
|---|---:|
| Cliques no site | **72** |
| Páginas com impressão | **71** |
| └ das quais são páginas de questão | **59** |
| Impressões das 59 páginas de questão | **771** |
| Cliques das 59 páginas de questão | **4** |
| Posição média das 59 | **13,0** |
| Melhor posição | **3,5** |
| Quantas no top 10 | **27** |

As consultas que trazem essas impressões são **enunciado colado no Google**.

---

## O que essa medição decidiu

**A tese da Fase 2 está validada, e duas leituras anteriores caíram.**

1. **Publicar página de questão funciona.** A aposta era que as indexadas seriam
   hubs e que as folhas não performavam. É o contrário: 59 das 71 páginas com
   impressão são questões, elas somam mais impressão que a home, e 27 estão no
   top 10. A cauda longa que a auditoria previu existe e o site já compete nela.
2. **"Detectada, mas não indexada" não é rejeição por qualidade.** O balde de
   rejeição é "Rastreada, mas não indexada", e tem **1** página. O Google indexou
   59 páginas de questão e as ranqueia bem; ele parou de **rastrear** o resto. É
   orçamento de rastreamento, e por isso malha interna vem antes de publicar mais.
3. **Descartada:** a hipótese de que as páginas não indexavam por serem duplicata
   do texto da FGV. O dado não a sustenta — se fosse isso, as 59 indexadas não
   ranqueariam. (Elas *são* commodity no HTML, o que explica margem estreita, não
   ausência de resultado.)

## Os dois experimentos que essa linha de base mede

Eles mexem em coisas diferentes, em prazos diferentes, e **por isso não sobem
juntos** — se subissem, um CTR que mexesse não teria causa atribuível.

| | muda | prazo | como medir |
|---|---|---|---|
| **Description** (`app/questoes/[materia]/[slug]/page.tsx`) | CTR na posição em que a página já está | dias | mesmo relatório de Desempenho, 7–10 dias depois |
| **Malha interna** (hub `/questoes` → questões) | posição, via rastreamento | 3–4 semanas | quantas das 197 saem de "Detectada" |

A description subiu primeiro, sozinha, em 12/09/2026. O critério é o CTR das
páginas de questão contra os **771 / 4** desta linha de base.
