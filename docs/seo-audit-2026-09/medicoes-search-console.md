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

A description subiu primeiro, em 12/09/2026. O critério é o CTR das páginas de
questão contra os **771 / 4** desta linha de base.

### Interferência aceita, e por quê

A regra era não misturar. Ela foi **relaxada no mesmo dia**, deliberadamente: a
correção da malha interna (anel de irmãs + âncora com título) subiu horas depois
da description, em 12/09/2026.

O motivo é o denominador. **A linha de base é 4 cliques.** Qualquer leitura de CTR
sobre 4 cliques é ruído — não existe medição a proteger aqui, e segurar duas
linhas de código por dez dias pra blindar um número que já nasce sem poder
estatístico é processo comendo resultado. Isso não era sabido quando a regra foi
escrita; passou a ser quando a linha de base apareceu.

As duas mudanças continuam separáveis no relatório, e é assim que se deve ler:

- **description** → coluna **CTR**, na posição em que a página já está, efeito em
  dias;
- **malha** → coluna **posição**, via rastreamento, efeito em 3–4 semanas. Dentro
  de 7–10 dias o efeito dela na posição é praticamente nulo.

Ou seja: se o CTR mexer nos próximos 7–10 dias **e a posição média ficar perto de
13,0**, a causa é a description. Se a posição andar junto, a atribuição está
contaminada e o número não sustenta conclusão — nesse caso vale esperar as 3–4
semanas e olhar quantas das 197 saíram de "Detectada".

### Malha interna — o estado medido em 12/09/2026

Antes da correção, medido nas 10 páginas de Direito Eleitoral em produção, e
idêntico nas 20 matérias (todas têm exatamente 10 publicadas e o código era o
mesmo): das 10 páginas, 6 recebiam 9 links de irmãs, 1 recebia 6 e **3 recebiam
zero**. Eram **60 das 200 páginas** sem link de irmã nenhum, vivendo só do hub e
da página da prova — e quais eram as 60 era sorteio, porque a ordem é de UUID.

Depois da correção, medido nas 200 páginas do build: **grau de entrada 6 e grau de
saída 6 em todas as 200**, zero órfãs.
