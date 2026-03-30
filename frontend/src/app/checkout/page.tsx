"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import MainLayout from "@/components/features/MainLayout";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { formatCurrency, formatDate, type Seat, type Event } from "@/lib/mock-data";
import { useCartStore } from "@/store/cart";
import { useAuthStore } from "@/store/auth";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

type PaymentMethod = "pix" | "card";
type Step = "payment" | "confirm" | "success";

const INSTALLMENT_OPTIONS = [
  { value: 1, label: "À vista" },
  { value: 2, label: "2x" },
  { value: 3, label: "3x" },
  { value: 6, label: "6x" },
  { value: 12, label: "12x" },
];

function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function formatCep(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.replace(/(\d{5})(\d)/, "$1-$2");
}

function validateCpf(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(digits[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  return rest === parseInt(digits[10]);
}

interface AddressData {
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, event, clearCart } = useCartStore();

  const seats = items.map((i) => i.seat);
  const subtotal = seats.reduce((s, seat) => s + seat.priceCents, 0);
  const fee = event ? Math.round(subtotal * (event.serviceFeePercent / 100)) : 0;
  const total = subtotal + fee;

  if (stripePromise) {
    return (
      <Elements stripe={stripePromise}>
        <CheckoutForm
          seats={seats}
          event={event}
          subtotal={subtotal}
          fee={fee}
          total={total}
          router={router}
          clearCart={clearCart}
        />
      </Elements>
    );
  }

  return (
    <Elements stripe={null}>
      <CheckoutForm
        seats={seats}
        event={event}
        subtotal={subtotal}
        fee={fee}
        total={total}
        router={router}
        clearCart={clearCart}
      />
    </Elements>
  );
}

interface CheckoutFormProps {
  seats: Seat[];
  event: Event | null;
  subtotal: number;
  fee: number;
  total: number;
  router: ReturnType<typeof useRouter>;
  clearCart: () => void;
}

function CheckoutForm({ seats, event, subtotal, fee, total, router, clearCart }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();

  const [step, setStep] = useState<Step>("payment");
  const [method, setMethod] = useState<PaymentMethod>("pix");
  const [loading, setLoading] = useState(false);
  const [pixCopied, setPixCopied] = useState(false);
  const [installments, setInstallments] = useState(1);
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null);

  const reservationIds = useCartStore((s) => s.reservationIds);
  const accessToken = useAuthStore((s) => s.accessToken);

  const [form, setForm] = useState({
    name: "",
    cpf: "",
    email: "",
    phone: "",
    cep: "",
    street: "",
    neighborhood: "",
    city: "",
    state: "",
    cardName: "",
  });
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const [cepLoading, setCepLoading] = useState(false);

  function updateField(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  }

  const lookupCep = useCallback(async (rawCep: string) => {
    const digits = rawCep.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data: AddressData = await res.json();
      if (!data.erro) {
        setForm((f) => ({
          ...f,
          street: data.logradouro,
          neighborhood: data.bairro,
          city: data.localidade,
          state: data.uf,
        }));
      } else {
        toast.error("CEP não encontrado");
      }
    } catch {
      toast.error("Erro ao buscar CEP");
    } finally {
      setCepLoading(false);
    }
  }, []);

  function handleCepChange(value: string) {
    const formatted = formatCep(value);
    updateField("cep", formatted);
    if (formatted.replace(/\D/g, "").length === 8) {
      lookupCep(formatted);
    }
  }

  function validatePayment() {
    const next: Partial<typeof form> = {};
    if (!form.name.trim()) next.name = "Nome obrigatório";
    if (!form.email.trim()) next.email = "E-mail obrigatório";
    if (!form.cpf.trim()) {
      next.cpf = "CPF obrigatório";
    } else if (!validateCpf(form.cpf)) {
      next.cpf = "CPF inválido";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleConfirm() {
    setLoading(true);
    try {
      // 1. Create order on the backend → get clientSecret
      const orderRes = await apiFetch<{ orderId: string; clientSecret: string; totalCents: number }>(
        "/orders",
        {
          method: "POST",
          accessToken,
          body: JSON.stringify({ reservationIds }),
        }
      );
      setConfirmedOrderId(orderRes.orderId);

      // 2. Confirm payment with Stripe (card) or wait for PIX webhook
      if (method === "card" && stripe && elements) {
        const cardElement = elements.getElement(CardElement);
        if (cardElement && orderRes.clientSecret) {
          const { error } = await stripe.confirmCardPayment(orderRes.clientSecret, {
            payment_method: {
              card: cardElement,
              billing_details: { name: form.cardName || form.name, email: form.email },
            },
          });
          if (error) {
            toast.error(error.message ?? "Pagamento recusado pelo cartão");
            setLoading(false);
            return;
          }
        }
      }
      // PIX: webhook will confirm asynchronously — we show success and let user check tickets

      clearCart();
      setStep("success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao processar pagamento. Tente novamente.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function copyPixKey() {
    navigator.clipboard.writeText("catraca@pagamentos.com.br");
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 2000);
  }

  const installmentAmount = total / installments;

  if (step === "success") {
    return (
      <MainLayout>
        <div className="max-w-lg mx-auto px-6 py-20 text-center">
          <div className="w-16 h-16 bg-primary rounded-sm flex items-center justify-center mx-auto mb-6">
            <CheckIcon />
          </div>
          <h1 className="font-display font-black text-3xl uppercase tracking-tight text-on-surface mb-2">
            Pedido confirmado!
          </h1>
          <p className="text-sm font-body text-on-surface/50 mb-8">
            Seus ingressos foram enviados para{" "}
            <span className="text-on-surface font-medium">{form.email || "seu e-mail"}</span>.
          </p>
          {event && (
            <div className="bg-surface-lowest rounded-md p-5 text-left mb-8">
              <p className="text-xs font-body uppercase tracking-widest text-on-surface/40 mb-3">
                Resumo
              </p>
              <p className="font-display font-bold text-sm text-on-surface tracking-tight">
                {event.homeTeam} vs {event.awayTeam}
              </p>
              <p className="text-xs text-on-surface/40 font-body mt-1">
                {formatDate(event.startsAt)}
              </p>
              <div className="mt-4 pt-4 border-t border-outline-variant flex justify-between">
                <span className="font-display font-bold uppercase tracking-tight text-on-surface text-sm">
                  Total pago
                </span>
                <span className="font-display font-black text-on-surface tracking-tight">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
          )}
          <div className="flex flex-col gap-3">
            <Button fullWidth onClick={() => router.push(`/orders/${confirmedOrderId ?? ""}`)}>
              Ver detalhes do pedido
            </Button>
            <Button fullWidth variant="secondary" onClick={() => router.push("/tickets")}>
              Meus ingressos
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-body uppercase tracking-widest text-on-surface/40 mb-1">
            Finalizar compra
          </p>
          <h1 className="font-display font-black text-3xl md:text-4xl text-on-surface tracking-tight uppercase">
            Checkout
          </h1>
        </div>

        {/* Progress steps */}
        <div className="flex items-center gap-3 mb-10">
          {(["payment", "confirm"] as const).map((s, idx) => {
            const stepOrder: Step[] = ["payment", "confirm", "success"];
            const isActive = step === s;
            const isDone = stepOrder.indexOf(step) > stepOrder.indexOf(s);
            return (
              <div key={s} className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div
                    className={[
                      "w-6 h-6 rounded-sm flex items-center justify-center text-xs font-display font-bold transition-colors duration-200",
                      isDone || isActive
                        ? "bg-primary text-on-primary"
                        : "bg-surface-dim text-on-surface/30",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-current={isActive ? "step" : undefined}
                  >
                    {isDone ? "✓" : idx + 1}
                  </div>
                  <span
                    className={[
                      "text-xs font-display font-semibold uppercase tracking-tight",
                      isActive ? "text-on-surface" : "text-on-surface/30",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {s === "payment" ? "Pagamento" : "Confirmação"}
                  </span>
                </div>
                {idx < 1 && (
                  <div className="w-8 h-px bg-outline-variant" />
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* ── Form ────────────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {step === "payment" && (
              <div className="flex flex-col gap-8">
                {/* Buyer info */}
                <section className="bg-surface-lowest rounded-md p-6">
                  <h2 className="font-display font-bold text-sm uppercase tracking-tight text-on-surface mb-5">
                    Dados do comprador
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <Input
                        label="Nome completo"
                        placeholder="Rafael Souza"
                        value={form.name}
                        onChange={(e) => updateField("name", e.target.value)}
                        error={errors.name}
                        aria-describedby={errors.name ? "name-error" : undefined}
                      />
                    </div>
                    <Input
                      label="E-mail"
                      type="email"
                      placeholder="rafael@exemplo.com"
                      value={form.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      error={errors.email}
                      aria-describedby={errors.email ? "email-error" : undefined}
                    />
                    <div>
                      <Input
                        label="CPF"
                        placeholder="000.000.000-00"
                        value={form.cpf}
                        onChange={(e) => updateField("cpf", formatCpf(e.target.value))}
                        error={errors.cpf}
                        aria-describedby={errors.cpf ? "cpf-error" : undefined}
                        inputMode="numeric"
                      />
                    </div>
                    <Input
                      label="Telefone"
                      type="tel"
                      placeholder="(11) 98765-4321"
                      value={form.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                    />
                  </div>
                </section>

                {/* Address */}
                <section className="bg-surface-lowest rounded-md p-6">
                  <h2 className="font-display font-bold text-sm uppercase tracking-tight text-on-surface mb-5">
                    Endereço de cobrança
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="relative">
                      <Input
                        label="CEP"
                        placeholder="00000-000"
                        value={form.cep}
                        onChange={(e) => handleCepChange(e.target.value)}
                        inputMode="numeric"
                      />
                      {cepLoading && (
                        <span className="absolute right-3 top-9 text-xs text-on-surface/40 font-body animate-pulse">
                          Buscando…
                        </span>
                      )}
                    </div>
                    <div className="sm:col-span-2">
                      <Input
                        label="Logradouro"
                        placeholder="Rua, Avenida…"
                        value={form.street}
                        onChange={(e) => updateField("street", e.target.value)}
                      />
                    </div>
                    <Input
                      label="Bairro"
                      placeholder="Bairro"
                      value={form.neighborhood}
                      onChange={(e) => updateField("neighborhood", e.target.value)}
                    />
                    <Input
                      label="Cidade"
                      placeholder="São Paulo"
                      value={form.city}
                      onChange={(e) => updateField("city", e.target.value)}
                    />
                  </div>
                </section>

                {/* Payment method */}
                <section className="bg-surface-lowest rounded-md p-6">
                  <h2 className="font-display font-bold text-sm uppercase tracking-tight text-on-surface mb-5">
                    Forma de pagamento
                  </h2>

                  {/* Method tabs */}
                  <div className="flex gap-2 mb-6" role="tablist" aria-label="Forma de pagamento">
                    {(["pix", "card"] as PaymentMethod[]).map((m) => (
                      <button
                        key={m}
                        role="tab"
                        aria-selected={method === m}
                        onClick={() => setMethod(m)}
                        className={[
                          "flex-1 py-3 px-4 rounded-sm text-sm font-display font-semibold uppercase tracking-tight transition-colors duration-150",
                          method === m
                            ? "bg-primary text-on-primary"
                            : "bg-surface border border-outline-variant text-on-surface/50 hover:border-primary hover:text-on-surface",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {m === "pix" ? "PIX" : "Cartão"}
                      </button>
                    ))}
                  </div>

                  {method === "pix" ? (
                    <div className="flex flex-col items-center gap-4 py-6 text-center">
                      <div className="w-40 h-40 bg-surface-low rounded-sm flex items-center justify-center">
                        <div className="w-32 h-32 bg-surface-dim rounded-none grid grid-cols-8 gap-0.5 p-2" aria-label="QR Code PIX placeholder">
                          {Array.from({ length: 64 }).map((_, i) => (
                            <div
                              key={i}
                              className={
                                (i * 13 + i * 7) % 3 === 0
                                  ? "bg-primary"
                                  : "bg-surface-lowest"
                              }
                            />
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-body text-on-surface/50 mb-1">
                          Escaneie o QR Code ou copie a chave PIX
                        </p>
                        <div className="flex items-center gap-2 bg-surface-low rounded-sm px-4 py-2.5">
                          <code className="text-xs font-body text-on-surface/70 flex-1 truncate">
                            catraca@pagamentos.com.br
                          </code>
                          <button
                            onClick={copyPixKey}
                            className="text-xs font-body text-on-surface/40 hover:text-on-surface transition-colors shrink-0"
                          >
                            {pixCopied ? "Copiado!" : "Copiar"}
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-on-surface/30 font-body">
                        Após o pagamento, a confirmação é automática em até 1 minuto.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <Input
                        label="Nome no cartão"
                        placeholder="RAFAEL A SOUZA"
                        value={form.cardName}
                        onChange={(e) => updateField("cardName", e.target.value.toUpperCase())}
                      />

                      {/* Stripe CardElement or fallback */}
                      {stripePromise ? (
                        <div>
                          <label className="block text-xs font-display font-semibold uppercase tracking-tight text-on-surface/50 mb-2">
                            Dados do cartão
                          </label>
                          <div className="bg-surface px-4 py-3 rounded-sm border border-outline-variant focus-within:border-primary transition-colors duration-150">
                            <CardElement
                              options={{
                                style: {
                                  base: {
                                    fontSize: "14px",
                                    fontFamily: "Inter, sans-serif",
                                    color: "var(--color-on-surface, #1a1a1a)",
                                    "::placeholder": { color: "rgba(0,0,0,0.3)" },
                                  },
                                  invalid: { color: "var(--color-error, #c00)" },
                                },
                                hidePostalCode: true,
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-on-surface/40 font-body bg-surface-low rounded-sm px-4 py-3">
                          Configure <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> para habilitar pagamento por cartão.
                        </p>
                      )}

                      {/* Installments */}
                      <div>
                        <label className="block text-xs font-display font-semibold uppercase tracking-tight text-on-surface/50 mb-2">
                          Parcelamento
                        </label>
                        <select
                          value={installments}
                          onChange={(e) => setInstallments(Number(e.target.value))}
                          className="w-full bg-surface px-4 py-2.5 text-sm text-on-surface font-body rounded-sm border border-outline-variant focus:outline-none focus:border-primary transition-colors duration-150"
                        >
                          {INSTALLMENT_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.value === 1
                                ? `À vista — ${formatCurrency(total)}`
                                : `${opt.label} de ${formatCurrency(installmentAmount)} (sem juros)`}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </section>

                <Button
                  fullWidth
                  size="lg"
                  onClick={() => {
                    if (validatePayment()) setStep("confirm");
                  }}
                >
                  Revisar pedido →
                </Button>
              </div>
            )}

            {step === "confirm" && (
              <div className="flex flex-col gap-6">
                <section className="bg-surface-lowest rounded-md p-6">
                  <h2 className="font-display font-bold text-sm uppercase tracking-tight text-on-surface mb-4">
                    Revisão do pedido
                  </h2>
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between text-sm">
                      <span className="font-body text-on-surface/50">Comprador</span>
                      <span className="font-body text-on-surface">{form.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="font-body text-on-surface/50">E-mail</span>
                      <span className="font-body text-on-surface">{form.email}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="font-body text-on-surface/50">Pagamento</span>
                      <span className="font-body text-on-surface uppercase">
                        {method === "pix"
                          ? "PIX"
                          : installments === 1
                          ? "Cartão — à vista"
                          : `Cartão — ${installments}x de ${formatCurrency(installmentAmount)}`}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-outline-variant pt-3 mt-1">
                      <span className="font-display font-bold uppercase tracking-tight text-on-surface">
                        Total
                      </span>
                      <span className="font-display font-black text-on-surface tracking-tight">
                        {formatCurrency(total)}
                      </span>
                    </div>
                  </div>
                </section>

                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => setStep("payment")}
                  >
                    ← Voltar
                  </Button>
                  <Button
                    fullWidth
                    size="lg"
                    onClick={handleConfirm}
                    disabled={loading}
                  >
                    {loading ? "Processando…" : "Confirmar pagamento"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* ── Order Summary Sidebar ───────────────────────────────────── */}
          <aside className="w-full lg:w-72 shrink-0">
            <div className="bg-surface-lowest rounded-md p-6 sticky top-20">
              <h3 className="font-display font-bold text-xs uppercase tracking-tight text-on-surface/50 mb-4">
                Pedido
              </h3>
              {event && (
                <>
                  <p className="font-display font-bold text-sm text-on-surface tracking-tight mb-0.5">
                    {event.homeTeam} vs {event.awayTeam}
                  </p>
                  <p className="text-xs text-on-surface/40 font-body mb-5">
                    {formatDate(event.startsAt)}
                  </p>
                </>
              )}

              <div className="flex flex-col gap-2.5 mb-5">
                {seats.map((seat) => (
                  <div key={seat.id} className="flex justify-between text-sm">
                    <span className="font-body text-on-surface/60">
                      {seat.section} · {seat.row}{seat.number}
                    </span>
                    <span className="font-body text-on-surface">
                      {formatCurrency(seat.priceCents)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-outline-variant pt-4 flex flex-col gap-2">
                <div className="flex justify-between text-sm">
                  <span className="font-body text-on-surface/40">Subtotal</span>
                  <span className="font-body text-on-surface">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-body text-on-surface/40">Taxa</span>
                  <span className="font-body text-on-surface">{formatCurrency(fee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-display font-bold uppercase tracking-tight text-on-surface text-sm">
                    Total
                  </span>
                  <span className="font-display font-black text-on-surface tracking-tight">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </MainLayout>
  );
}

function CheckIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
