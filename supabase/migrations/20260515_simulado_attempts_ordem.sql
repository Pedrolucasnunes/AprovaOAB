-- Ordem fixa da questão dentro do simulado (réplica da prova: blocos por disciplina).
-- O gerador preenche 0..79; a tela de questões e o gabarito ordenam por esta coluna.
-- Nullable — simulados antigos ficam NULL (já finalizados, sem impacto).

ALTER TABLE simulado_attempts ADD COLUMN ordem INTEGER;
