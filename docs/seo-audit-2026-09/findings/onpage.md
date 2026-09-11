# On-Page SEO - 78/100 (peso 20%)

## O que funciona

- Titulos e descricoes unicos em todas as paginas de conteudo (amostra de 14 paginas de questao: 14 titulos unicos)
- Descricoes entre 139 e 155 caracteres - faixa ideal
- Um h1 por pagina com hierarquia h2/h3 limpa
- Hub /questoes linka as 20 materias sem orfas
- Breadcrumbs visiveis e marcados
- lang=pt-BR e og:locale corretos
- OG e Twitter Cards completos com summary_large_image 1200x630 e og:image:alt

## Achados

### [High] 13 de 14 titulos de pagina de questao passam de 60 caracteres

Dois passam de 70. O sufixo '| AprovaOAB' consome ~12 caracteres. Exemplo com 76 chars: 'Responsabilidade civil do Estado - Questao do 36o Exame OAB 2022 | AprovaOAB'.

**Correcao:** Remover o sufixo de marca nas paginas de questao e encurtar o padrao para 'Tema - NNo Exame OAB (ANO)'.

### [Medium] /editais sem og:image

/editais e /editais/48-exame-oab sao as unicas rotas do site sem og:image. Compartilhamentos em WhatsApp e LinkedIn saem sem card.

**Correcao:** Replicar o opengraph-image.tsx que ja existe em /questoes e /provas.

### [Medium] Descricao de fallback nas paginas legais

/termos-de-uso e /politica-de-privacidade usam a descricao generica do site.

**Correcao:** Escrever description propria para cada uma.

### [Medium] UUID completo nas URLs de questao

Exemplo: /questoes/direito-civil/contratos-41-exame-oab-00110fb7-1098-4479-8aac-8670baf37188 - 36 caracteres sem valor semantico.

**Correcao:** Migrar para ID curto sequencial antes de publicar o restante do acervo, para nao precisar de 2.240 redirects depois.

### [Low] Home nao linka paginas de questao

O link equity da home so desce ate os hubs de materia.

**Correcao:** Adicionar bloco de questoes em destaque na home.
