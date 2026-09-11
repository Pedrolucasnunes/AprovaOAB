# AI Search Readiness (GEO) - 55/100 (peso 10%)

## O que funciona

- HTML pre-renderizado - GPTBot, ClaudeBot, PerplexityBot e Google-Extended leem sem executar JS
- robots.txt com User-Agent: * e Allow: / - nenhum crawler de IA bloqueado
- Schema Quiz com pergunta e resposta explicitas e altamente citavel
- FAQ com pergunta como heading e resposta curta logo abaixo
- /editais/48-exame-oab traz datas concretas e verificaveis com atribuicao a fonte oficial

## Achados

### [Medium] Sem /llms.txt

Retorna 404. E o indice curado que aponta aos LLMs o que vale ler no site.

**Correcao:** Publicar /llms.txt indexando questoes, provas, editais e materias.

### [Medium] Ausencia de dados proprios citaveis

O acervo de 2.240 questoes e os dados de desempenho dos usuarios permitem estatisticas originais que nenhum concorrente tem.

**Correcao:** Publicar estudos como 'materias com maior indice de erro na 1a fase' e 'temas mais recorrentes por exame'.

### [Medium] Sem mencoes de marca fora do dominio

Busca por AprovaOAB nao retorna o site; o espaco e ocupado por Passe na OAB, Qconcursos, Simulai OAB e Gran Cursos. Ressalva: a ferramenta de busca usada opera na regiao EUA, entao o sinal e indicativo e nao conclusivo.

**Correcao:** Confirmar no Search Console e iniciar trabalho de relacoes publicas digitais no nicho juridico.

### [Low] Sem /.well-known/security.txt

Retorna 404.

**Correcao:** Publicar security.txt com canal de contato para reporte de vulnerabilidades.
