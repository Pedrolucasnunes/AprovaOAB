import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const metadata = {
  title: "Termos de Uso — AprovaOAB",
}

export default function TermosDeUsoPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>

        <h1 className="mb-2 text-3xl font-bold text-foreground">Termos de Uso</h1>
        <p className="mb-10 text-sm text-muted-foreground">Última atualização: abril de 2026</p>

        <div className="space-y-8 text-sm leading-7 text-muted-foreground">
          <section>
            <h2 className="mb-3 text-base font-semibold text-foreground">1. Aceitação dos termos</h2>
            <p>
              Ao criar uma conta e utilizar a plataforma AprovaOAB (<strong className="text-foreground">aprovaoab.app.br</strong>),
              você concorda com estes Termos de Uso. Caso não concorde, não utilize a plataforma.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-foreground">2. Descrição do serviço</h2>
            <p>
              A AprovaOAB é uma plataforma de preparação para o Exame da OAB que oferece:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Banco de questões comentadas por área do direito.</li>
              <li>Simulados completos no formato da 1ª fase da OAB.</li>
              <li>Agenda inteligente de estudos personalizada.</li>
              <li>Relatórios de desempenho e progresso.</li>
              <li>Integração opcional com o Google Calendar.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-foreground">3. Cadastro e conta</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Você deve fornecer informações verdadeiras e manter seus dados atualizados.</li>
              <li>É responsável por manter a confidencialidade da sua senha.</li>
              <li>Cada pessoa pode criar apenas uma conta.</li>
              <li>Menores de 18 anos devem ter autorização dos pais ou responsáveis.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-foreground">4. Uso permitido</h2>
            <p>Você concorda em usar a plataforma apenas para fins de estudo pessoal e preparação para a OAB. É vedado:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Compartilhar sua conta com outras pessoas.</li>
              <li>Reproduzir, distribuir ou comercializar o conteúdo da plataforma sem autorização.</li>
              <li>Tentar acessar áreas restritas ou interferir no funcionamento do sistema.</li>
              <li>Usar a plataforma para fins ilícitos ou que violem direitos de terceiros.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-foreground">5. Propriedade intelectual</h2>
            <p>
              Todo o conteúdo da plataforma — incluindo questões, textos, layouts e código — é de propriedade da
              AprovaOAB ou de seus licenciadores. O uso não autorizado é proibido e sujeito às penalidades previstas
              em lei.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-foreground">6. Integração com Google Calendar</h2>
            <p>
              A integração com o Google Calendar é opcional. Ao conectar sua conta do Google, você autoriza a
              AprovaOAB a criar, atualizar e excluir eventos de estudo em seu calendário. Você pode revogar esse
              acesso a qualquer momento pela plataforma ou pelas configurações da sua conta Google.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-foreground">7. Limitação de responsabilidade</h2>
            <p>
              A AprovaOAB não garante aprovação no Exame da OAB. A plataforma é uma ferramenta de apoio ao estudo
              e os resultados dependem exclusivamente do esforço e dedicação do usuário. Não nos responsabilizamos
              por danos indiretos decorrentes do uso ou impossibilidade de uso da plataforma.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-foreground">8. Alterações nos termos</h2>
            <p>
              Podemos atualizar estes termos periodicamente. Notificaremos sobre mudanças significativas por e-mail
              ou aviso na plataforma. O uso continuado após as alterações implica aceitação dos novos termos.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-foreground">9. Rescisão</h2>
            <p>
              Você pode encerrar sua conta a qualquer momento. Reservamos o direito de suspender ou encerrar contas
              que violem estes termos, sem aviso prévio.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-foreground">10. Contato</h2>
            <p>
              Dúvidas sobre estes termos? Entre em contato pelo e-mail{" "}
              <a href="mailto:contato.aprovaoab@gmail.com" className="text-primary hover:underline">
                contato.aprovaoab@gmail.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
