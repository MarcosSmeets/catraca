"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/features/MainLayout";
import Button from "@/components/ui/Button";
import { apiFetch } from "@/lib/api";
import { PENDING_CHECKOUT_ORDER_ID_KEY } from "@/lib/checkout-storage";
import { useAuthStore } from "@/store/auth";
import type { Order } from "@/lib/mock-data";

type Phase = "loading" | "paid" | "timeout" | "missing";

export default function CheckoutSuccessPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [phase, setPhase] = useState<Phase>("loading");
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !accessToken) return;

    const id = sessionStorage.getItem(PENDING_CHECKOUT_ORDER_ID_KEY);
    if (!id) {
      setPhase("missing");
      return;
    }
    setOrderId(id);

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 45;

    const tick = async () => {
      if (cancelled) return;
      attempts += 1;
      try {
        const o = await apiFetch<Order>(`/me/orders/${id}`, { accessToken });
        if (o.status === "PAID") {
          sessionStorage.removeItem(PENDING_CHECKOUT_ORDER_ID_KEY);
          setPhase("paid");
          return;
        }
      } catch {
        /* retry */
      }
      if (attempts >= maxAttempts) {
        setPhase("timeout");
        return;
      }
      setTimeout(tick, 2000);
    };

    void tick();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  if (phase === "missing") {
    return (
      <MainLayout>
        <div className="max-w-lg mx-auto px-6 py-20 text-center">
          <h1 className="font-display font-black text-2xl uppercase tracking-tight text-on-surface mb-4">
            Nenhum pedido em andamento
          </h1>
          <p className="text-sm font-body text-on-surface/50 mb-8">
            Abra esta página após concluir o pagamento no Stripe, ou acesse seus pedidos no perfil.
          </p>
          <Button fullWidth onClick={() => router.push("/profile?tab=orders")}>
            Meus pedidos
          </Button>
        </div>
      </MainLayout>
    );
  }

  if (phase === "loading") {
    return (
      <MainLayout>
        <div className="max-w-lg mx-auto px-6 py-24 text-center">
          <p className="text-xs font-body uppercase tracking-widest text-on-surface/40 mb-3">
            Pagamento
          </p>
          <h1 className="font-display font-black text-2xl uppercase tracking-tight text-on-surface mb-2">
            Confirmando seu pedido…
          </h1>
          <p className="text-sm font-body text-on-surface/50">
            Isso leva alguns segundos após o Stripe confirmar o pagamento.
          </p>
        </div>
      </MainLayout>
    );
  }

  if (phase === "timeout" && orderId) {
    return (
      <MainLayout>
        <div className="max-w-lg mx-auto px-6 py-20 text-center">
          <h1 className="font-display font-black text-2xl uppercase tracking-tight text-on-surface mb-4">
            Ainda processando
          </h1>
          <p className="text-sm font-body text-on-surface/50 mb-8">
            O pagamento pode levar um pouco mais. Você pode acompanhar o pedido na área &quot;Meus
            pedidos&quot;.
          </p>
          <div className="flex flex-col gap-3">
            <Button fullWidth onClick={() => router.push(`/orders/${orderId}`)}>
              Ver pedido
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
      <div className="max-w-lg mx-auto px-6 py-20 text-center">
        <div className="w-16 h-16 bg-accent rounded-sm flex items-center justify-center mx-auto mb-6">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className="font-display font-black text-3xl uppercase tracking-tight text-on-surface mb-2">
          Pagamento confirmado!
        </h1>
        <p className="text-sm font-body text-on-surface/50 mb-8">
          Seus ingressos estão disponíveis em &quot;Meus ingressos&quot;.
        </p>
        <div className="flex flex-col gap-3">
          {orderId && (
            <Button fullWidth onClick={() => router.push(`/orders/${orderId}`)}>
              Detalhes do pedido
            </Button>
          )}
          <Button fullWidth variant="secondary" onClick={() => router.push("/tickets")}>
            Meus ingressos
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
