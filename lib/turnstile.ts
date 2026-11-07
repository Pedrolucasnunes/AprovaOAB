// Chave do site do Turnstile (Cloudflare), a verificação humana do cadastro, do
// login, dos reenvios de código e da troca de senha.
//
// Fica no código, e não no env, porque é PÚBLICA: vai no HTML de qualquer
// forma, e uma variável esquecida no painel da Vercel deixaria o login sem
// comprovante, que é exatamente o modo de falha que não aparece em teste. A
// chave SECRETA mora só no painel do Supabase (Authentication → Attack
// Protection), que é quem confere o comprovante.
//
// A chave de produção só funciona em aprovaoab.app.br. Fora de produção vai a
// chave de teste da Cloudflare, que sempre passa. Consequência: com a proteção
// ligada no Supabase, login e cadastro feitos a partir do `npm run dev` são
// recusados, porque o comprovante de teste não vale para a chave secreta real.
// O mesmo vale para os deploys de preview (*.vercel.app), fora da lista de
// domínios do widget.

const CHAVE_PRODUCAO = "0x4AAAAAAF26xrlWfjC_Y9eu"
const CHAVE_TESTE_SEMPRE_PASSA = "1x00000000000000000000AA"

export const TURNSTILE_SITE_KEY =
  process.env.NODE_ENV === "production" ? CHAVE_PRODUCAO : CHAVE_TESTE_SEMPRE_PASSA
