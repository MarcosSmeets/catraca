import MainLayout from "@/components/features/MainLayout";

export const metadata = {
  title: "Política de Privacidade — Catraca",
};

export default function PrivacidadePage() {
  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-10">
          <p className="text-xs font-body uppercase tracking-widest text-on-surface/40 mb-1">
            Legal
          </p>
          <h1 className="font-display font-black text-3xl md:text-4xl text-on-surface tracking-tight uppercase">
            Política de Privacidade
          </h1>
          <p className="text-sm font-body text-on-surface/40 mt-2">
            Última atualização: março de 2026
          </p>
        </div>

        <div className="prose prose-sm max-w-none font-body text-on-surface/80 leading-relaxed space-y-8">
          <section>
            <h2 className="font-display font-bold text-lg text-on-surface tracking-tight mb-3">
              1. Dados Coletados
            </h2>
            <p>Coletamos as seguintes informações:</p>
            <ul className="list-disc list-inside space-y-1 mt-2 text-on-surface/70">
              <li>Dados de identificação: nome, CPF, e-mail, telefone</li>
              <li>Dados de pagamento: processados pela Stripe (não armazenamos dados do cartão)</li>
              <li>Dados de uso: eventos visualizados, compras realizadas, preferências</li>
              <li>Dados técnicos: endereço IP, tipo de navegador, cookies de sessão</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display font-bold text-lg text-on-surface tracking-tight mb-3">
              2. Uso dos Dados
            </h2>
            <p>Utilizamos seus dados para:</p>
            <ul className="list-disc list-inside space-y-1 mt-2 text-on-surface/70">
              <li>Processar suas compras e emitir ingressos</li>
              <li>Comunicar informações sobre seus pedidos</li>
              <li>Personalizar sua experiência na plataforma</li>
              <li>Cumprir obrigações legais e fiscais</li>
              <li>Prevenir fraudes e garantir a segurança da plataforma</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display font-bold text-lg text-on-surface tracking-tight mb-3">
              3. Compartilhamento de Dados
            </h2>
            <p>
              Compartilhamos dados pessoais somente com organizadores dos eventos para fins de
              controle de acesso, com a Stripe para processamento de pagamentos, e com autoridades
              competentes quando exigido por lei.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-lg text-on-surface tracking-tight mb-3">
              4. Seus Direitos (LGPD)
            </h2>
            <p>
              Nos termos da Lei Geral de Proteção de Dados (Lei 13.709/2018), você tem direito a:
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2 text-on-surface/70">
              <li>Acessar, corrigir ou deletar seus dados pessoais</li>
              <li>Solicitar a portabilidade dos seus dados</li>
              <li>Revogar o consentimento para tratamento de dados</li>
              <li>Opor-se ao tratamento de dados para fins de marketing</li>
            </ul>
            <p className="mt-3">
              Para exercer estes direitos, entre em contato pelo e-mail{" "}
              <a href="mailto:privacidade@catraca.com.br" className="text-accent hover:underline">
                privacidade@catraca.com.br
              </a>.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-lg text-on-surface tracking-tight mb-3">
              5. Segurança
            </h2>
            <p>
              Adotamos medidas técnicas e organizacionais para proteger seus dados contra acesso
              não autorizado, incluindo criptografia TLS, tokens JWT de curta duração e armazenamento
              seguro de senhas com bcrypt.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-lg text-on-surface tracking-tight mb-3">
              6. Contato — DPO
            </h2>
            <p>
              Nosso Encarregado de Proteção de Dados (DPO) pode ser contactado pelo e-mail{" "}
              <a href="mailto:dpo@catraca.com.br" className="text-accent hover:underline">
                dpo@catraca.com.br
              </a>.
            </p>
          </section>
        </div>
      </div>
    </MainLayout>
  );
}
