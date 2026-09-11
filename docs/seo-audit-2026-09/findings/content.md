# Content Quality / E-E-A-T - 62/100 (peso 23%)

## O que funciona

- Copy da home especifica e orientada a beneficio, 1.715 palavras
- Paginas de materia com introducao contextual real (direito-civil: 555 palavras)
- /editais/48-exame-oab e um template excelente: 794 palavras, cronograma, taxa, passo a passo, FAQ, schema FAQPage + EducationEvent
- Paginas de questao com ~407 palavras (~250 de conteudo real) - nao e thin content
- Depoimentos reais com aviso explicito de autenticidade

## Achados

### [Critical] ~91% do acervo de questoes nao e indexavel

O site tem ~2.240 questoes (28 provas x 80) mas apenas 200 com pagina propria no sitemap - 10 por materia, sem paginacao. As paginas de prova contem o texto das 80 questoes mas linkam so 10 paginas individuais. Concorrentes indexam milhares (Simulai OAB: 5.875; Prova da OAB em Questoes: 2.320).

**Correcao:** Remover o limite de 10 no generateStaticParams, adicionar paginacao rastreavel nas paginas de materia, linkar as 80 questoes em cada pagina de prova. Publicar apenas questoes com resolucao comentada real para evitar thin content.

### [Medium] Duplicacao interna entre paginas de prova e de questao

O enunciado de cada questao aparece tanto em /provas/[exame] (15.266 palavras, 665 KB de HTML na prova 45) quanto na pagina individual.

**Correcao:** Nas paginas de prova, exibir enunciado resumido com link para a pagina completa da questao.

### [High] Nenhum sinal de E-E-A-T em tema YMYL

Conteudo juridico e YMYL. Nao ha pagina sobre, autor identificado, advogado responsavel, credencial OAB/UF, CNPJ ou razao social. Concorrentes tem professores nomeados com curriculo.

**Correcao:** Criar /sobre, nomear responsavel tecnico com OAB/UF, adicionar CNPJ no rodape e Person + contactPoint no schema.

### [High] Nenhum conteudo editorial

/blog, /sobre e /precos retornam 404. A newsletter Cafe com OAB e promovida na home mas nao tem arquivo publico nem RSS. Nenhuma pagina cobre buscas informacionais como 'como passar na OAB' ou 'o que cai na 1a fase'.

**Correcao:** Publicar o arquivo da newsletter em /cafe-com-oab/[slug] com Article schema e criar 5 paginas informacionais de topo de funil.

### [Medium] Hubs rasos

/questoes tem 164 palavras e /editais 194 (incluindo header e footer). Sao paginas de categoria que devem rankear em termos amplos.

**Correcao:** Usar /questoes/direito-civil como modelo: 300-500 palavras de introducao contextual.
