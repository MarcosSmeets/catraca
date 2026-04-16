"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import MainLayout from "@/components/features/MainLayout";
import Button from "@/components/ui/Button";
import { createResaleCheckoutSession, type ResaleBuyerPayload } from "@/lib/resale-api";
import { useAuthStore } from "@/store/auth";
import { toast } from "sonner";

export default function ResaleCheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const listingId = params.listingId as string;
  const user = useAuthStore((s) => s.user);

  const [buyer, setBuyer] = useState<ResaleBuyerPayload>({
    buyerName: "",
    buyerEmail: "",
    buyerCpf: "",
    buyerPhone: "",
    buyerCep: "",
    buyerStreet: "",
    buyerNeighborhood: "",
    buyerCity: "",
    buyerState: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setBuyer((b) => ({
        ...b,
        buyerName: user.name,
        buyerEmail: user.email,
      }));
    }
  }, [user]);

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { url } = await createResaleCheckoutSession(listingId, buyer);
      window.location.href = url;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Não foi possível iniciar o pagamento.";
      toast.error(msg);
      setSubmitting(false);
    }
  }

  return (
    <MainLayout>
      <div className="max-w-lg mx-auto px-6 py-10">
        <h1 className="font-display font-bold text-xl uppercase tracking-tight text-on-surface mb-2">
          Checkout — revenda
        </h1>
        <p className="text-sm text-on-surface/50 font-body mb-8">
          Preencha os dados do comprador. O pagamento é processado com repasse ao vendedor (Stripe Connect).
        </p>
        <form onSubmit={handlePay} className="space-y-4">
          {(
            [
              ["buyerName", "Nome completo"],
              ["buyerEmail", "E-mail"],
              ["buyerCpf", "CPF"],
              ["buyerPhone", "Telefone"],
              ["buyerCep", "CEP"],
              ["buyerStreet", "Rua"],
              ["buyerNeighborhood", "Bairro"],
              ["buyerCity", "Cidade"],
              ["buyerState", "UF"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label className="block text-[10px] font-body uppercase tracking-widest text-on-surface/40 mb-1">
                {label}
              </label>
              <input
                required
                className="w-full bg-surface px-4 py-2.5 text-sm text-on-surface font-body rounded-sm border border-outline-variant focus:outline-none focus:border-accent"
                value={buyer[key]}
                onChange={(e) => setBuyer((b) => ({ ...b, [key]: e.target.value }))}
              />
            </div>
          ))}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" fullWidth onClick={() => router.back()}>
              Voltar
            </Button>
            <Button type="submit" fullWidth disabled={submitting}>
              {submitting ? "Redirecionando…" : "Pagar com Stripe"}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
