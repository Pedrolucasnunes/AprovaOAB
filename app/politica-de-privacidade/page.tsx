import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const metadata = {
  title: "Política de Privacidade — AprovaOAB",
}

export default function PoliticaDePrivacidadePage() {
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

        <h1 className="mb-2 text-3xl font-bold text-foreground">Política de Privacidade</h1>
        <p className="mb-10 text-sm text-muted-foreground">Última atualização: maio de 2026</p>

        <div className="space-y-8 text-sm leading-7 text-muted-foreground">
          <section>
            <h2 className="mb-3 text-base font-semibold text-foreground">1. Quem somos</h2>
            <p>
              A AprovaOAB (<strong className="text-foreground">aprovaoab.app.br</strong>) é uma plataforma de preparação
              inteligente para o Exame da Ordem dos Advogados do Brasil (OAB), desenvolvida para ajudar estudantes a
              organizarem seus estudos, praticarem questões e acompanharem seu desempenho.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-foreground">2. Dados que coletamos</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li><strong className="text-foreground">Dados de cadastro:</strong> nome completo e endereço de e-mail.</li>
              <li><strong className="text-foreground">Dados de autenticação:</strong> quando você usa o Login com Google, recebemos seu nome e e-mail fornecidos pelo Google.</li>
              <li><strong className="text-foreground">Dados de uso:</strong> respostas de questões, resultados de simulados e eventos da agenda de estudos.</li>
              <li><strong className="text-foreground">Integração com Google Calendar:</strong> se você optar por conectar sua conta do Google Calendar, armazenamos tokens de acesso para criar e gerenciar eventos em seu calendário. Você pode revogar esse acesso a qualquer momento.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-foreground">3. Como usamos seus dados</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Criar e gerenciar sua conta na plataforma.</li>
              <li>Personalizar sua experiência de estudos e gerar relatórios de desempenho.</li>
              <li>Sincronizar eventos de estudo com o Google Calendar, quando autorizado.</li>
              <li>Enviar comunicações importantes sobre sua conta (ex.: confirmação de e-mail).</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-foreground">4. Compartilhamento de dados</h2>
            <p>
              Não vendemos nem compartilhamos seus dados pessoais com terceiros para fins comerciais. Utilizamos os
              seguintes serviços para operar a plataforma:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li><strong className="text-foreground">Supabase:</strong> banco de dados e autenticação.</li>
              <li><strong className="text-foreground">Vercel:</strong> hospedagem da aplicação.</li>
              <li><strong className="text-foreground">Google APIs:</strong> autenticação via Google e integração com Google Calendar.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-foreground">5. Retenção de dados</h2>
            <p>
              Seus dados são mantidos enquanto sua conta estiver ativa. Ao solicitar a exclusão da conta, removemos
              todos os seus dados pessoais em até 30 dias, exceto quando obrigados por lei a mantê-los por período maior.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-foreground">6. Seus direitos</h2>
            <p>Você tem direito a:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Acessar os dados que temos sobre você.</li>
              <li>Corrigir dados incorretos.</li>
              <li>Solicitar a exclusão dos seus dados.</li>
              <li>Revogar o acesso ao Google Calendar a qualquer momento nas configurações da plataforma.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-foreground">7. Segurança</h2>
            <p>
              Adotamos medidas técnicas para proteger seus dados, incluindo criptografia em trânsito (HTTPS) e
              armazenamento seguro de credenciais. Tokens do Google Calendar são armazenados de forma criptografada
              e nunca expostos ao lado do cliente.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-foreground">8. Cookies e tecnologias de rastreamento</h2>
            <p>
              Utilizamos <strong className="text-foreground">Google Tag Manager</strong> e{" "}
              <strong className="text-foreground">Google Analytics 4</strong> para coletar
              métricas anônimas de uso — páginas visitadas, jornada dentro da plataforma e tipo
              de dispositivo. Esses dados nos ajudam a entender quais funcionalidades ajudam mais
              na sua preparação.
            </p>
            <p className="mt-3">
              <strong className="text-foreground">Base legal:</strong> os cookies de{" "}
              <strong className="text-foreground">análise</strong> (Google Analytics) são tratados
              com fundamento no <strong className="text-foreground">legítimo interesse</strong>,
              coletando apenas métricas anônimas — ficam ativos por padrão, e você pode recusá-los
              a qualquer momento (opt-out). Já os cookies de{" "}
              <strong className="text-foreground">marketing</strong> dependem do seu{" "}
              <strong className="text-foreground">consentimento explícito</strong> e permanecem
              desativados até que você os autorize. Tudo é controlado via Google Consent Mode v2.
            </p>
            <p className="mt-3">
              Você pode revisar ou alterar suas preferências a qualquer momento clicando em{" "}
              <strong className="text-foreground">"Gerenciar cookies"</strong> no rodapé do site.
              Saiba mais sobre como o Google processa esses dados em{" "}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                policies.google.com/privacy
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-foreground">9. Contato</h2>
            <p>
              Dúvidas sobre esta política? Entre em contato pelo e-mail{" "}
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
