# Schema / Structured Data - 85/100 (peso 10%)

## O que funciona

- Organization com logo, sameAs (X, Instagram, LinkedIn) e areaServed
- WebSite com inLanguage pt-BR
- SoftwareApplication EducationalApplication com ofertas Gratis (R$0) e Pro (R$19)
- CollectionPage + ItemList nos hubs e listagens
- BreadcrumbList bem formado com 3 niveis
- Quiz nas paginas de questao com eduQuestionType Multiple choice, acceptedAnswer e 3 suggestedAnswer
- FAQPage e EducationEvent em /editais/48-exame-oab
- Todos os blocos JSON-LD parseiam sem erro

## Achados

### [Medium] Home sem FAQPage schema

A home tem 5 perguntas de FAQ visiveis (Quanto custa, As questoes sao no padrao real, Preciso de cartao, Ja reprovei, Como funciona o cancelamento) sem marcacao FAQPage. O componente ja existe em /editais/48-exame-oab.

**Correcao:** Reaproveitar o gerador de FAQPage schema na home.

### [Medium] Quiz sem propriedades recomendadas

Falta name, learningResourceType 'Practice problem' e educationalAlignment - recomendadas pelo Google para o rich result de Practice Problems.

**Correcao:** Adicionar as tres propriedades ao gerador de Quiz schema.

### [Medium] Sem Course schema

Para EdTech, Course + CourseInstance habilita o carrossel de cursos na busca.

**Correcao:** Adicionar Course schema descrevendo a trilha de preparacao.

### [Low] Organization incompleto

Sem contactPoint, foundingDate, email ou legalName - propriedades que alimentam o Knowledge Panel.

**Correcao:** Completar o Organization schema.

### [Low] Ofertas sem url e availability

As Offers do SoftwareApplication nao declaram url, availability nem priceValidUntil.

**Correcao:** Completar as ofertas.

### [Info] Review/AggregateRating: decisao ja tomada, nao e pendencia

O CLAUDE.md do repo (secao 'Depoimentos da landing') ja documenta a decisao de NAO marcar Review/AggregateRating: nao existe nota no produto, entao aggregateRating seria numero inventado, e review que o proprio site coleta sobre si e self-serving, que o Google nao aceita para rich result. Risco de acao manual, ganho zero.

**Correcao:** A analise esta correta. Manter como esta - nao reabrir.
