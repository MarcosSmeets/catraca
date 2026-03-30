import MainLayout from "@/components/features/MainLayout";

export const metadata = {
  title: "Termos de Uso — Catraca",
};

export default function TermosPage() {
  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-10">
          <p className="text-xs font-body uppercase tracking-widest text-on-surface/40 mb-1">
            Legal
          </p>
          <h1 className="font-display font-black text-3xl md:text-4xl text-on-surface tracking-tight uppercase">
            Termos de Uso
          </h1>
          <p className="text-sm font-body text-on-surface/40 mt-2">
            Última atualização: março de 2026
          </p>
        </div>

        <div className="prose prose-sm max-w-none font-body text-on-surface/80 leading-relaxed space-y-8">
          <section>
            <h2 className="font-display font-bold text-lg text-on-surface tracking-tight mb-3">
              1. Aceitação dos Termos
            </h2>
            <p>
              Ao acessar e utilizar a plataforma Catraca (&ldquo;Plataforma&rdquo;), você concorda com estes Termos de Uso.
              Se você não concordar com quaisquer disposições, não utilize a Plataforma.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-lg text-on-surface tracking-tight mb-3">
              2. Serviços Oferecidos
            </h2>
            <p>
              A Catraca é um marketplace que conecta torcedores a ingressos de eventos esportivos no Brasil.
              Atuamos como intermediários entre compradores e organizadores de eventos, não sendo responsáveis
              pela realização, alteração ou cancelamento dos eventos.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-lg text-on-surface tracking-tight mb-3">
              3. Cadastro e Conta
            </h2>
            <p>
              Para realizar compras, você deve criar uma conta com informações verdadeiras e precisas.
              Você é responsável pela confidencialidade de suas credenciais de acesso.
              CPF informado deve ser válido e pertencer ao titular da conta.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-lg text-on-surface tracking-tight mb-3">
              4. Compras e Pagamentos
            </h2>
            <p>
              Os ingressos estão sujeitos à disponibilidade. Ao confirmar uma compra, você autoriza
              o débito do valor total (ingresso + taxa de serviço) no meio de pagamento informado.
              O processamento de pagamentos é realizado via Stripe, plataforma certificada PCI DSS.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-lg text-on-surface tracking-tight mb-3">
              5. Política de Reembolso
            </h2>
            <p>
              Em caso de cancelamento do evento pelo organizador, o valor integral será reembolsado
              em até 10 dias úteis. Não realizamos reembolsos por desistência do comprador após a confirmação
              da compra, exceto conforme previsto pelo Código de Defesa do Consumidor.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-lg text-on-surface tracking-tight mb-3">
              6. Uso dos Ingressos
            </h2>
            <p>
              Os ingressos são pessoais e intransferíveis, exceto quando realizada a transferência
              através da plataforma Catraca. A transferência não autorizada pode resultar no bloqueio
              do ingresso sem direito a reembolso.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-lg text-on-surface tracking-tight mb-3">
              7. Contato
            </h2>
            <p>
              Em caso de dúvidas, entre em contato pelo e-mail{" "}
              <a href="mailto:suporte@catraca.com.br" className="text-primary hover:underline">
                suporte@catraca.com.br
              </a>.
            </p>
          </section>
        </div>
      </div>
    </MainLayout>
  );
}
