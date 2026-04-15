"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/features/MainLayout";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { formatCurrency, formatDate, type Seat, type Event } from "@/lib/mock-data";
import { useCartStore } from "@/store/cart";
import { useAuthStore } from "@/store/auth";
import { apiFetch } from "@/lib/api";
import { PENDING_CHECKOUT_ORDER_ID_KEY } from "@/lib/checkout-storage";
import { toast } from "sonner";

type PaymentMethod = "pix" | "card";
type Step = "payment" | "confirm";

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

  return (
    <CheckoutForm
      seats={seats}
      event={event}
      subtotal={subtotal}
      fee={fee}
      total={total}
      router={router}
      clearCart={clearCart}
    />
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
  const [step, setStep] = useState<Step>("payment");
  const [method, setMethod] = useState<PaymentMethod>("pix");
  const [loading, setLoading] = useState(false);

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
      const orderRes = await apiFetch<{
        orderId: string;
        totalCents: number;
        stripeEnabled: boolean;
      }>("/orders", {
        method: "POST",
        accessToken,
        body: JSON.stringify({ reservationIds }),
      });

      if (!orderRes.stripeEnabled) {
        sessionStorage.setItem(PENDING_CHECKOUT_ORDER_ID_KEY, orderRes.orderId);
        try {
          await apiFetch(`/dev/orders/${orderRes.orderId}/pay`, {
            method: "POST",
            accessToken,
          });
        } catch {
          toast.error("Não foi possível simular o pagamento (dev).");
          return;
        }
        clearCart();
        router.push("/checkout/success");
        return;
      }

      const sessionRes = await apiFetch<{ url: string }>(
        `/orders/${orderRes.orderId}/checkout-session`,
        {
          method: "POST",
          accessToken,
          body: JSON.stringify({ paymentMethod: method }),
        }
      );
      if (!sessionRes.url) {
        toast.error("Resposta inválida do servidor.");
        return;
      }
      sessionStorage.setItem(PENDING_CHECKOUT_ORDER_ID_KEY, orderRes.orderId);
      window.location.href = sessionRes.url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao processar pagamento. Tente novamente.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <p className="text-xs font-body uppercase tracking-widest text-on-surface/40 mb-1">
            Finalizar compra
          </p>
          <h1 className="font-display font-black text-3xl md:text-4xl text-on-surface tracking-tight uppercase">
            Checkout
          </h1>
        </div>

        <div className="flex items-center gap-3 mb-10">
          {(["payment", "confirm"] as const).map((s, idx) => {
            const isActive = step === s;
            const isDone = (step === "confirm" && s === "payment") || false;
            return (
              <div key={s} className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div
                    className={[
                      "w-6 h-6 rounded-sm flex items-center justify-center text-xs font-display font-bold transition-colors duration-200",
                      isDone || isActive
                        ? "bg-accent text-on-accent"
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
                {idx < 1 && <div className="w-8 h-px bg-outline-variant" />}
              </div>
            );
          })}
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 min-w-0">
            {step === "payment" && (
              <div className="flex flex-col gap-8">
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
                      />
                    </div>
                    <Input
                      label="E-mail"
                      type="email"
                      placeholder="rafael@exemplo.com"
                      value={form.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      error={errors.email}
                    />
                    <div>
                      <Input
                        label="CPF"
                        placeholder="000.000.000-00"
                        value={form.cpf}
                        onChange={(e) => updateField("cpf", formatCpf(e.target.value))}
                        error={errors.cpf}
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

                <section className="bg-surface-lowest rounded-md p-6">
                  <h2 className="font-display font-bold text-sm uppercase tracking-tight text-on-surface mb-5">
                    Forma de pagamento
                  </h2>
                  <div className="flex gap-2 mb-6" role="tablist" aria-label="Forma de pagamento">
                    {(["pix", "card"] as PaymentMethod[]).map((m) => (
                      <button
                        key={m}
                        role="tab"
                        aria-selected={method === m}
                        type="button"
                        onClick={() => setMethod(m)}
                        className={[
                          "flex-1 py-3 px-4 rounded-sm text-sm font-display font-semibold uppercase tracking-tight transition-colors duration-150",
                          method === m
                            ? "bg-accent text-on-accent"
                            : "bg-surface border border-outline-variant text-on-surface/50 hover:border-accent hover:text-on-surface",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {m === "pix" ? "PIX" : "Cartão"}
                      </button>
                    ))}
                  </div>
                  <p className="text-sm font-body text-on-surface/50">
                    Você será redirecionado para o checkout seguro da Stripe para concluir o pagamento
                    {method === "pix" ? " via PIX" : " com cartão"}.
                  </p>
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
                        {method === "pix" ? "PIX (Stripe)" : "Cartão (Stripe)"}
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
                  <Button variant="secondary" size="lg" onClick={() => setStep("payment")}>
                    ← Voltar
                  </Button>
                  <Button fullWidth size="lg" onClick={handleConfirm} disabled={loading}>
                    {loading ? "Redirecionando…" : "Ir para o pagamento"}
                  </Button>
                </div>
              </div>
            )}
          </div>

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
                      {seat.section} · {seat.row}
                      {seat.number}
                    </span>
                    <span className="font-body text-on-surface">{formatCurrency(seat.priceCents)}</span>
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
