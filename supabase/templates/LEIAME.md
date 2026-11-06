# Modelos de e-mail do Supabase Auth

Os modelos moram no **painel** do Supabase (Authentication → Emails → Templates), não no
código. Esta pasta guarda a cópia de referência, para que mudança no painel tenha onde ser
revisada. Quem altera o modelo lá atualiza o arquivo aqui no mesmo dia.

| Arquivo | Modelo no painel | Assunto |
|---|---|---|
| `recuperar-senha.html` | Reset Password | `Trocar sua senha - AprovaOAB` |
| `link-de-acesso.html` | Magic Link | `Pedido de acesso à sua conta - AprovaOAB` |

O de cadastro ("Confirm signup", assunto `Seu código de verificação - AprovaOAB`) foi
personalizado direto no painel e ainda não tem cópia aqui.

## Ordem de aplicação

`recuperar-senha.html` leva a `https://www.aprovaoab.app.br/auth/confirm`. **Essa rota
precisa estar no ar antes de o modelo ser colado no painel**: colado antes, todo e-mail
de troca de senha sai com link quebrado.

## Duas regras

- **O link de acesso não traz link de propósito.** O site não entra por link mágico, então
  esse e-mail só sai quando alguém chama a API do Supabase direto. Sem
  `{{ .ConfirmationURL }}` nem `{{ .Token }}`, ele vira só um aviso.
- **Nada de `{{ .Data.* }}` em modelo nenhum.** O nome do cadastro é texto livre, e o
  código de cadastro vai para o endereço que a pessoa digitou, que pode ser de outra
  pessoa. Um modelo que mostrasse o nome entregaria a qualquer endereço o texto que um
  atacante escrevesse no campo de nome, com o AprovaOAB como remetente.
