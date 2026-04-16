"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import MainLayout from "@/components/features/MainLayout";
import Button from "@/components/ui/Button";
import {
  createResaleCheckoutSession,
  createResaleListingHold,
  releaseResaleListingHold,
  type ResaleBuyerPayload,
} from "@/lib/resale-api";
import { ApiError } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { toast } from "sonner";

function useCountdown(initialSeconds: number) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    setSecondsLeft(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const isExpired = secondsLeft <= 0;
  const isUrgent = secondsLeft <= 120;

  return {
    display: `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`,
    isExpired,
    isUrgent,
    secondsLeft,
  };
}

export default function ResaleCheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const listingId = params.listingId as string;
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);

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
  const [holdId, setHoldId] = useState<string | null>(null);
  const [holdExpiresAt, setHoldExpiresAt] = useState<string | null>(null);
  const [reserveLoading, setReserveLoading] = useState(true);
  const [reserveConflict, setReserveConflict] = useState(false);

  const initialSeconds =
    holdExpiresAt != null
      ? Math.max(0, Math.floor((new Date(holdExpiresAt).getTime() - Date.now()) / 1000))
      : 0;
  const countdown = useCountdown(initialSeconds);

  useEffect(() => {
    if (user) {
      setBuyer((b) => ({
        ...b,
        buyerName: user.name,
        buyerEmail: user.email,
      }));
    }
  }, [user]);

  useEffect(() => {
    if (!accessToken) {
      const next = encodeURIComponent(`/checkout/resale/${listingId}`);
      router.replace(`/login?next=${next}`);
      return;
    }
    let cancelled = false;
    (async () => {
      setReserveLoading(true);
      setReserveConflict(false);
      try {
        const { holdId: hid, expiresAt } = await createResaleListingHold(listingId);
        if (cancelled) return;
        setHoldId(hid);
        setHoldExpiresAt(expiresAt);
      } catch (e: unknown) {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 409) {
          setReserveConflict(true);
          toast.error("Outra pessoa está finalizando este ingresso. Tente de novo em instantes.");
        } else {
          const msg = e instanceof Error ? e.message : "Não foi possível reservar o anúncio.";
          toast.error(msg);
        }
      } finally {
        if (!cancelled) setReserveLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, listingId, router]);

  const handleBack = useCallback(async () => {
    if (holdId) {
      try {
        await releaseResaleListingHold(holdId);
      } catch {
        /* best-effort */
      }
    }
    router.back();
  }, [holdId, router]);

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!holdId || countdown.isExpired) {
      toast.error("Sua reserva expirou. Volte à revenda e tente de novo.");
      return;
    }
    setSubmitting(true);
    try {
      const { url } = await createResaleCheckoutSession(listingId, holdId, buyer);
      window.location.href = url;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Não foi possível iniciar o pagamento.";
      toast.error(msg);
      setSubmitting(false);
    }
  }

  const formDisabled =
    reserveLoading || reserveConflict || !holdId || countdown.isExpired || submitting;

  return (
    <MainLayout>
      <div className="max-w-lg mx-auto px-6 py-10">
        <h1 className="font-display font-bold text-xl uppercase tracking-tight text-on-surface mb-2">
          Checkout — revenda
        </h1>
        <p className="text-sm text-on-surface/50 font-body mb-6">
          Você tem alguns minutos para concluir. O pagamento é feito pela Catraca (Stripe); o repasse ao vendedor é
          registrado pela plataforma.
        </p>

        {reserveLoading && (
          <p className="text-sm font-body text-on-surface/50 mb-6">Reservando anúncio…</p>
        )}

        {!reserveLoading && holdId && !reserveConflict && (
          <div
            className={[
              "rounded-sm px-4 py-3 mb-6 flex items-center justify-between",
              countdown.isExpired || countdown.isUrgent ? "bg-error/10" : "bg-surface-low",
            ]
              .filter(Boolean)
              .join(" ")}
            role="timer"
            aria-live="polite"
          >
            <span
              className={[
                "text-xs font-display font-semibold uppercase",
                countdown.isExpired || countdown.isUrgent ? "text-error" : "text-on-surface/50",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              Tempo para concluir
            </span>
            <span
              className={[
                "font-mono text-lg font-bold tabular-nums",
                countdown.isExpired || countdown.isUrgent ? "text-error" : "text-on-surface",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {countdown.isExpired ? "00:00" : countdown.display}
            </span>
          </div>
        )}

        {countdown.isExpired && holdId && !reserveConflict && (
          <p className="text-sm text-on-surface/60 font-body mb-4">
            A reserva acabou.{" "}
            <Link href="/revenda" className="text-primary underline underline-offset-2">
              Ver revenda
            </Link>
          </p>
        )}

        {reserveConflict && (
          <p className="text-sm text-on-surface/60 font-body mb-4">
            <Link href="/revenda" className="text-primary underline underline-offset-2">
              Voltar para a revenda
            </Link>
          </p>
        )}

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
                disabled={formDisabled}
                className="w-full bg-surface px-4 py-2.5 text-sm text-on-surface font-body rounded-sm border border-outline-variant focus:outline-none focus:border-accent disabled:opacity-50"
                value={buyer[key]}
                onChange={(e) => setBuyer((b) => ({ ...b, [key]: e.target.value }))}
              />
            </div>
          ))}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" fullWidth onClick={() => void handleBack()}>
              Voltar
            </Button>
            <Button type="submit" fullWidth disabled={formDisabled}>
              {submitting ? "Redirecionando…" : "Pagar"}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
