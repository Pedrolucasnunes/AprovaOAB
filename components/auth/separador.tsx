/**
 * A linha "ou com e-mail" entre o botão do Google e o formulário.
 *
 * O rótulo fica em caixa normal, não em versalete espaçado: caixa-alta é a
 * marca registrada de tela gerada e aqui ela não carregava informação nenhuma.
 * O fundo do rótulo é `bg-background` porque o formulário não vive mais dentro
 * de um `Card` — dentro da casca de duas colunas, card sobre fundo virava
 * caixa dentro de caixa.
 */
export function Separador({ children }: { children: string }) {
  return (
    <div className="relative">
      <div aria-hidden className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-background px-3 text-xs text-muted-foreground">{children}</span>
      </div>
    </div>
  )
}
