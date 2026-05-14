-- Timer server-side: started_at marca quando o usuário ACESSA o simulado pela 1ª vez.
-- Diferente de created_at (quando o simulado foi gerado mas talvez nunca aberto).
-- Sem default — simulados nunca iniciados ficam NULL; o GET seta no primeiro acesso.

ALTER TABLE simulados
  ADD COLUMN started_at TIMESTAMPTZ;
