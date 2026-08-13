-- Descadastro de e-mail que funciona.
--
-- O link de "descadastrar" da newsletter era
-- `mailto:oi@aprovaoab.app.br?subject=Descadastrar` — e o domínio NÃO TEM MX.
-- Quem pedia pra sair mandava e-mail pro vazio e continuava recebendo. Numa
-- newsletter que vai pra base inteira, isso não é detalhe de UX: sem caminho de
-- saída que funcione, a pessoa usa o botão "spam" do Gmail, que é o que derruba
-- a reputação do domínio de envio — inclusive a dos e-mails transacionais, que
-- não têm substituto (OTP de cadastro, cobrança recusada).
--
-- timestamptz e não boolean de propósito: "quando saiu" responde "quanto tempo
-- faz" e "saiu antes ou depois de qual campanha". Um boolean joga isso fora e
-- não se recupera. NULL = nunca pediu pra sair (o estado da maioria).
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS email_optout_at timestamptz;

-- Índice parcial: quem envia precisa da lista de EXCLUÍDOS, que é pequena
-- contra a tabela inteira. Mesmo padrão de users_diagnostic_reminder_at_idx.
CREATE INDEX IF NOT EXISTS users_email_optout_at_idx
  ON public.users (email_optout_at)
  WHERE email_optout_at IS NOT NULL;

COMMENT ON COLUMN public.users.email_optout_at IS
  'Quando o usuário pediu pra sair dos e-mails de marketing/reengajamento. '
  'NÃO bloqueia e-mail de conta e cobrança (OTP, boas-vindas, falha de '
  'pagamento, fim de acesso) nem lembrete que a própria pessoa pediu: cortar '
  'aviso de cobrança por opt-out de newsletter esconde do usuário que ele está '
  'prestes a perder o acesso.';
