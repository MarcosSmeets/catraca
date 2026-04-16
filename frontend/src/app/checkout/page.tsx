"use client";

import { useState, useCallback, useEffect, useRef, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loadStripe, type Stripe, type StripeElements, type PaymentRequest } from "@stripe/stripe-js";
import { Elements, CardNumberElement, CardExpiryElement, CardCvcElement, PaymentRequestButtonElement, useStripe, useElements } from "@stripe/react-stripe-js";
import MainLayout from "@/components/features/MainLayout";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { formatCurrency, formatDate, type Seat, type Event, type Order } from "@/lib/mock-data";
import { useCartStore } from "@/store/cart";
import { useAuthStore } from "@/store/auth";
import { apiFetch, ApiError } from "@/lib/api";
import { PENDING_CHECKOUT_ORDER_ID_KEY } from "@/lib/checkout-storage";
import { toast } from "sonner";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

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

const CARD_ELEMENT_STYLE = {
  base: {
    color: "#e0e0e0",
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: "14px",
    "::placeholder": { color: "#666" },
  },
  invalid: { color: "#ef4444" },
};

function CheckoutPageFallback() {
  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="h-8 w-48 bg-surface-dim rounded-sm mb-6 animate-pulse" />
        <div className="h-64 bg-surface-lowest rounded-md animate-pulse" />
      </div>
    </MainLayout>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<CheckoutPageFallback />}>
      <CheckoutPageInner />
    </Suspense>
  );
}

function CheckoutPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canceled = searchParams.get("canceled") === "1";
  const { items, event, clearCart } = useCartStore();

  const seats = items.map((i) => i.seat);
  const subtotal = seats.reduce((s, seat) => s + seat.priceCents, 0);
  const fee = event ? Math.round(subtotal * (event.serviceFeePercent / 100)) : 0;
  const total = subtotal + fee;

  const elementsOptions = useMemo(
    () => ({
      locale: "pt-BR" as const,
      appearance: {
        theme: "night" as const,
        variables: {
          colorPrimary: "#e91e63",
          colorBackground: "#1a1a1a",
          colorText: "#e0e0e0",
          fontFamily: "'Inter', system-ui, sans-serif",
        },
      },
    }),
    []
  );

  const formProps = {
    canceled,
    seats,
    event,
    subtotal,
    fee,
    total,
    router,
    clearCart,
  };

  if (stripePromise) {
    return (
      <Elements stripe={stripePromise} options={elementsOptions}>
        <StripeCheckoutForm {...formProps} />
      </Elements>
    );
  }

  // Dev mode: no Stripe key
  return <StripeCheckoutForm {...formProps} />;
}

interface CheckoutFormProps {
  canceled: boolean;
  seats: Seat[];
  event: Event | null;
  subtotal: number;
  fee: number;
  total: number;
  router: ReturnType<typeof useRouter>;
  clearCart: () => void;
}

/** Wrapper that provides stripe/elements from the Elements context. */
function StripeCheckoutForm(props: CheckoutFormProps) {
  // Only call hooks when we know <Elements> is wrapping us
  if (stripePromise) {
    return <StripeCheckoutFormWithHooks {...props} />;
  }
  return <CheckoutFormInner {...props} stripe={null} elements={null} />;
}

function StripeCheckoutFormWithHooks(props: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  return <CheckoutFormInner {...props} stripe={stripe} elements={elements} />;
}

interface CheckoutFormInnerProps extends CheckoutFormProps {
  stripe: Stripe | null;
  elements: StripeElements | null;
}

function CheckoutFormInner({
  canceled,
  seats,
  event,
  subtotal,
  fee,
  total,
  router,
  clearCart,
  stripe,
  elements,
}: CheckoutFormInnerProps) {
  const [step, setStep] = useState<Step>("payment");
  const [loading, setLoading] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [installments, setInstallments] = useState(1);
  const [paymentType, setPaymentType] = useState<"credit" | "debit">("credit");
  const canceledToastShown = useRef(false);
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [canPayWithWallet, setCanPayWithWallet] = useState(false);

  const reservationIds = useCartStore((s) => s.reservationIds);
  const accessToken = useAuthStore((s) => s.accessToken);

  // Apple Pay / Google Pay setup
  useEffect(() => {
    if (!stripe || total <= 0) return;

    const pr = stripe.paymentRequest({
      country: "BR",
      currency: "brl",
      total: {
        label: "Ingressos Catraca",
        amount: total,
      },
      requestPayerName: true,
      requestPayerEmail: true,
    });

    pr.canMakePayment().then((result) => {
      if (result) {
        setPaymentRequest(pr);
        setCanPayWithWallet(true);
      }
    });
  }, [stripe, total]);

  // Handle wallet payment (Apple Pay / Google Pay)
  useEffect(() => {
    if (!paymentRequest || !stripe) return;

    const handler = async (ev: { paymentMethod: { id: string }; complete: (status: "success" | "fail") => void }) => {
      try {
        // Create order
        const orderRes = await apiFetch<{
          orderId: string;
          totalCents: number;
          stripeEnabled: boolean;
        }>("/orders", {
          method: "POST",
          accessToken,
          body: JSON.stringify({ reservationIds }),
        });

        sessionStorage.setItem(PENDING_CHECKOUT_ORDER_ID_KEY, orderRes.orderId);

        // Create PaymentIntent
        const piRes = await apiFetch<{
          clientSecret: string;
          amountCents: number;
        }>(`/orders/${orderRes.orderId}/payment-intent`, {
          method: "POST",
          accessToken,
          body: JSON.stringify({}),
        });

        const { error, paymentIntent } = await stripe.confirmCardPayment(
          piRes.clientSecret,
          { payment_method: ev.paymentMethod.id },
          { handleActions: false }
        );

        if (error) {
          ev.complete("fail");
          setCardError(error.message ?? "Erro no pagamento.");
          return;
        }

        if (paymentIntent?.status === "requires_action") {
          ev.complete("success");
          const { error: actionError } = await stripe.confirmCardPayment(piRes.clientSecret);
          if (actionError) {
            setCardError(actionError.message ?? "Erro na autenticação.");
            return;
          }
        } else {
          ev.complete("success");
        }

        clearCart();
        router.push("/checkout/success");
      } catch (err) {
        ev.complete("fail");
        const msg = err instanceof Error ? err.message : "Erro ao processar pagamento.";
        toast.error(msg);
      }
    };

    paymentRequest.on("paymentmethod", handler);
    return () => {
      paymentRequest.off("paymentmethod", handler);
    };
  }, [paymentRequest, stripe, accessToken, reservationIds, clearCart, router]);

  useEffect(() => {
    if (!canceled || canceledToastShown.current) return;
    canceledToastShown.current = true;
    toast.message("Pagamento cancelado. Revise o pedido e tente novamente.");
  }, [canceled]);

  useEffect(() => {
    if (paymentType === "debit") setInstallments(1);
  }, [paymentType]);

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
    setCardError(null);
    try {
      // Check for existing pending order
      const pendingId =
        typeof window !== "undefined"
          ? sessionStorage.getItem(PENDING_CHECKOUT_ORDER_ID_KEY)
          : null;

      let orderId: string | null = null;

      if (pendingId && accessToken) {
        try {
          const existing = await apiFetch<Order>(`/me/orders/${pendingId}`, { accessToken });
          if (existing.status === "PAID") {
            sessionStorage.removeItem(PENDING_CHECKOUT_ORDER_ID_KEY);
            router.replace("/tickets?paid=1");
            return;
          }
          if (existing.status === "PENDING") {
            orderId = pendingId;
          } else {
            sessionStorage.removeItem(PENDING_CHECKOUT_ORDER_ID_KEY);
          }
        } catch (e) {
          if (e instanceof ApiError && e.status === 404) {
            sessionStorage.removeItem(PENDING_CHECKOUT_ORDER_ID_KEY);
          } else {
            const msg = e instanceof Error ? e.message : "Erro ao verificar o pedido.";
            toast.error(msg);
            return;
          }
        }
      }

      // Create order if needed
      if (!orderId) {
        const orderRes = await apiFetch<{
          orderId: string;
          totalCents: number;
          stripeEnabled: boolean;
        }>("/orders", {
          method: "POST",
          accessToken,
          body: JSON.stringify({
            reservationIds,
            buyerName: form.name,
            buyerEmail: form.email,
            buyerCpf: form.cpf,
            buyerPhone: form.phone,
            buyerCep: form.cep,
            buyerStreet: form.street,
            buyerNeighborhood: form.neighborhood,
            buyerCity: form.city,
            buyerState: form.state,
          }),
        });

        orderId = orderRes.orderId;
        sessionStorage.setItem(PENDING_CHECKOUT_ORDER_ID_KEY, orderId);

        // Dev mode (no Stripe)
        if (!orderRes.stripeEnabled) {
          try {
            await apiFetch(`/dev/orders/${orderId}/pay`, {
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
      }

      // Create PaymentIntent
      const piRes = await apiFetch<{
        clientSecret: string;
        amountCents: number;
      }>(`/orders/${orderId}/payment-intent`, {
        method: "POST",
        accessToken,
        body: JSON.stringify({}),
      });

      if (!stripe || !elements) {
        toast.error("Stripe não carregou. Recarregue a página.");
        return;
      }

      const cardNumberElement = elements.getElement(CardNumberElement);
      if (!cardNumberElement) {
        toast.error("Dados do cartão não preenchidos.");
        return;
      }

      // Build confirm options
      const confirmOptions: Parameters<typeof stripe.confirmCardPayment>[1] = {
        payment_method: {
          card: cardNumberElement,
          billing_details: {
            name: form.name,
            email: form.email,
            address: {
              postal_code: form.cep.replace(/\D/g, ""),
              line1: form.street,
              city: form.city,
              state: form.state,
              country: "BR",
            },
          },
        },
      };

      // Add installment plan for credit (> 1x)
      if (paymentType === "credit" && installments > 1) {
        (confirmOptions as Record<string, unknown>).payment_method_options = {
          card: {
            installments: {
              plan: {
                count: installments,
                interval: "month",
                type: "fixed_count",
              },
            },
          },
        };
      }

      const { error, paymentIntent } = await stripe.confirmCardPayment(
        piRes.clientSecret,
        confirmOptions
      );

      if (error) {
        setCardError(error.message ?? "Erro ao processar pagamento.");
        return;
      }

      if (paymentIntent?.status === "succeeded" || paymentIntent?.status === "processing") {
        clearCart();
        router.push("/checkout/success");
        return;
      }

      // For requires_action (3DS), Stripe handles it automatically via confirmCardPayment
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao processar pagamento. Tente novamente.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  const installmentOptions = useMemo(() => {
    const options: { value: number; label: string }[] = [];
    for (let i = 1; i <= 12; i++) {
      const installmentValue = total / i;
      if (i === 1) {
        options.push({ value: 1, label: `1x de ${formatCurrency(total)} (à vista)` });
      } else {
        options.push({ value: i, label: `${i}x de ${formatCurrency(Math.ceil(installmentValue))}` });
      }
    }
    return options;
  }, [total]);

  const hasStripe = !!stripePromise;

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
            <div className="flex flex-col gap-8" style={{ display: step === "payment" ? undefined : "none" }}>
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

                  {hasStripe ? (
                    <>
                      {/* Apple Pay / Google Pay */}
                      {canPayWithWallet && paymentRequest && (
                        <div className="mb-6">
                          <PaymentRequestButtonElement
                            options={{
                              paymentRequest,
                              style: {
                                paymentRequestButton: {
                                  type: "default",
                                  theme: "light",
                                  height: "48px",
                                },
                              },
                            }}
                          />
                          <div className="flex items-center gap-3 my-5">
                            <div className="flex-1 h-px bg-outline-variant" />
                            <span className="text-xs font-body text-on-surface/40 uppercase tracking-widest">
                              ou pague com cartão
                            </span>
                            <div className="flex-1 h-px bg-outline-variant" />
                          </div>
                        </div>
                      )}

                      {/* Payment type toggle */}
                      <div className="flex gap-2 mb-6">
                        <button
                          type="button"
                          onClick={() => setPaymentType("credit")}
                          className={[
                            "flex-1 py-2.5 px-4 rounded-md text-sm font-display font-semibold tracking-tight transition-all duration-150 cursor-pointer",
                            paymentType === "credit"
                              ? "bg-accent text-on-accent"
                              : "bg-surface-high text-on-surface/50 hover:text-on-surface",
                          ].join(" ")}
                        >
                          Crédito
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentType("debit")}
                          className={[
                            "flex-1 py-2.5 px-4 rounded-md text-sm font-display font-semibold tracking-tight transition-all duration-150 cursor-pointer",
                            paymentType === "debit"
                              ? "bg-accent text-on-accent"
                              : "bg-surface-high text-on-surface/50 hover:text-on-surface",
                          ].join(" ")}
                        >
                          Débito
                        </button>
                      </div>

                      {/* Card fields */}
                      <div className="flex flex-col gap-4">
                        <div>
                          <label className="block text-xs font-display font-semibold uppercase tracking-tight text-on-surface/60 mb-2">
                            Número do cartão
                          </label>
                          <div className="bg-surface-high border border-outline-variant rounded-md px-3 py-3">
                            <CardNumberElement options={{ style: CARD_ELEMENT_STYLE, showIcon: true }} />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-display font-semibold uppercase tracking-tight text-on-surface/60 mb-2">
                              Validade
                            </label>
                            <div className="bg-surface-high border border-outline-variant rounded-md px-3 py-3">
                              <CardExpiryElement options={{ style: CARD_ELEMENT_STYLE }} />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-display font-semibold uppercase tracking-tight text-on-surface/60 mb-2">
                              CVC
                            </label>
                            <div className="bg-surface-high border border-outline-variant rounded-md px-3 py-3">
                              <CardCvcElement options={{ style: CARD_ELEMENT_STYLE }} />
                            </div>
                          </div>
                        </div>

                        {/* Installments - credit only */}
                        {paymentType === "credit" && (
                          <div>
                            <label className="block text-xs font-display font-semibold uppercase tracking-tight text-on-surface/60 mb-2">
                              Parcelas
                            </label>
                            <select
                              value={installments}
                              onChange={(e) => setInstallments(Number(e.target.value))}
                              className="w-full bg-surface-high border border-outline-variant rounded-md px-3 py-3 text-sm font-body text-on-surface appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent"
                            >
                              {installmentOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      {cardError && (
                        <p className="mt-3 text-sm font-body text-red-400">{cardError}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm font-body text-on-surface/50">
                      Modo desenvolvimento — o pagamento será simulado automaticamente.
                    </p>
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

            <div className="flex flex-col gap-6" style={{ display: step === "confirm" ? undefined : "none" }}>
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
                    {hasStripe && (
                      <div className="flex justify-between text-sm">
                        <span className="font-body text-on-surface/50">Pagamento</span>
                        <span className="font-body text-on-surface text-right max-w-[14rem]">
                          Cartão de {paymentType === "credit" ? "crédito" : "débito"}
                          {paymentType === "credit" && installments > 1
                            ? ` — ${installments}x de ${formatCurrency(Math.ceil(total / installments))}`
                            : ""}
                        </span>
                      </div>
                    )}
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

                {cardError && (
                  <p className="text-sm font-body text-red-400">{cardError}</p>
                )}

                <div className="flex gap-3">
                  <Button variant="secondary" size="lg" onClick={() => setStep("payment")}>
                    ← Voltar
                  </Button>
                  <Button fullWidth size="lg" onClick={handleConfirm} disabled={loading}>
                    {loading ? "Processando pagamento…" : `Pagar ${formatCurrency(total)}`}
                  </Button>
                </div>
              </div>
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
