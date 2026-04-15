"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/features/MainLayout";
import Button from "@/components/ui/Button";
import { formatCurrency, formatDate } from "@/lib/mock-data";
import { useCartStore } from "@/store/cart";

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
    total: initialSeconds,
  };
}

const RESERVATION_SECONDS = 10 * 60;

export default function CartPage() {
  const router = useRouter();
  const { items, event, removeSeat, clearCart, secondsRemaining } = useCartStore();

  const initial = secondsRemaining();
  const countdown = useCountdown(initial);

  const cartSeats = items.map((i) => i.seat);
  const subtotal = cartSeats.reduce((sum, s) => sum + s.priceCents, 0);
  const fee = event ? Math.round(subtotal * (event.serviceFeePercent / 100)) : 0;
  const total = subtotal + fee;

  const [eventImgSrc, setEventImgSrc] = useState(
    event?.imageUrl && event.imageUrl.startsWith("http")
      ? event.imageUrl
      : "/placeholder-event.svg"
  );

  useEffect(() => {
    if (countdown.isExpired && items.length > 0) {
      clearCart();
    }
  }, [countdown.isExpired, items.length, clearCart]);

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-body uppercase tracking-widest text-on-surface/40 mb-1">
            Sua seleção
          </p>
          <h1 className="font-display font-black text-3xl md:text-4xl text-on-surface tracking-tight uppercase">
            Carrinho
          </h1>
        </div>

        {cartSeats.length === 0 ? (
          /* Empty state */
          <div className="bg-surface-lowest rounded-md p-16 text-center max-w-md mx-auto">
            <p className="font-display font-bold text-xl text-on-surface/20 tracking-tight uppercase mb-3">
              Carrinho vazio
            </p>
            <p className="text-sm text-on-surface/30 font-body mb-6">
              Você ainda não selecionou nenhum ingresso.
            </p>
            <Link href="/search">
              <Button variant="primary">Explorar eventos</Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            {/* ── Cart Items ─────────────────────────────────────────────── */}
            <div className="flex-1 min-w-0 flex flex-col gap-6">
              {/* Reservation countdown */}
              <div
                className={[
                  "rounded-sm px-5 py-4 flex items-center justify-between",
                  countdown.isExpired || countdown.isUrgent
                    ? "bg-error/10"
                    : "bg-surface-low",
                ]
                  .filter(Boolean)
                  .join(" ")}
                role="timer"
                aria-live="polite"
              >
                <div>
                  <p
                    className={[
                      "text-xs font-display font-semibold uppercase tracking-tight",
                      countdown.isExpired || countdown.isUrgent
                        ? "text-error"
                        : "text-on-surface/50",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {countdown.isExpired
                      ? "Reserva expirada"
                      : "Reserva expira em"}
                  </p>
                  {!countdown.isExpired && (
                    <p
                      className={[
                        "font-display font-black text-2xl tracking-tight",
                        countdown.isUrgent ? "text-error" : "text-on-surface",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {countdown.display}
                    </p>
                  )}
                </div>
                {countdown.isExpired ? (
                  <Link href="/search">
                    <Button variant="secondary" size="sm">
                      Selecionar novamente
                    </Button>
                  </Link>
                ) : (
                  <div className="flex items-center gap-1.5" aria-hidden="true">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className={[
                          "h-1 rounded-full transition-all duration-500",
                          i < Math.ceil((countdown.secondsLeft / (countdown.total || RESERVATION_SECONDS)) * 5)
                            ? countdown.isUrgent
                              ? "bg-error w-8"
                              : "bg-accent w-8"
                            : "bg-surface-dim w-4",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Event info */}
              {event && (
                <div className="bg-surface-lowest rounded-md overflow-hidden">
                  <div className="relative h-32 bg-surface-dim">
                    <Image
                      src={eventImgSrc}
                      alt={event.title}
                      fill
                      className="object-cover opacity-60"
                      sizes="800px"
                      onError={() => setEventImgSrc("/placeholder-event.svg")}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-transparent" />
                    <div className="absolute bottom-4 left-5">
                      <p className="text-xs text-on-primary/60 font-body uppercase tracking-widest">
                        {event.league}
                      </p>
                      <p className="font-display font-bold text-base text-on-primary tracking-tight">
                        {event.homeTeam}{" "}
                        <span className="opacity-50">vs</span>{" "}
                        {event.awayTeam}
                      </p>
                      <p className="text-xs text-on-primary/50 font-body">
                        {formatDate(event.startsAt)}
                      </p>
                    </div>
                  </div>

                  {/* Seat rows */}
                  <div className="divide-y divide-outline-variant">
                    {cartSeats.map((seat) => (
                      <div
                        key={seat.id}
                        className="flex items-center justify-between px-5 py-4"
                      >
                        <div>
                          <p className="font-body font-medium text-sm text-on-surface">
                            {seat.section}
                          </p>
                          <p className="text-xs text-on-surface/40 font-body">
                            Fileira {seat.row} · Assento {seat.number}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-display font-bold text-sm text-on-surface tracking-tight">
                            {formatCurrency(seat.priceCents)}
                          </span>
                          <button
                            onClick={() => removeSeat(seat.id)}
                            className="text-on-surface/30 hover:text-error transition-colors duration-150"
                            aria-label={`Remover assento ${seat.row}${seat.number} do carrinho`}
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {event && (
                <Link
                  href={`/events/${event.id}`}
                  className="text-sm font-body text-on-surface/40 hover:text-on-surface transition-colors duration-150 underline underline-offset-2 self-start"
                >
                  ← Adicionar mais assentos
                </Link>
              )}
            </div>

            {/* ── Order Summary ──────────────────────────────────────────── */}
            <aside className="w-full lg:w-80 shrink-0">
              <div className="bg-surface-lowest rounded-md p-6 sticky top-20">
                <h2 className="font-display font-bold text-base uppercase tracking-tight text-on-surface mb-5">
                  Resumo
                </h2>

                <div className="flex flex-col gap-3 mb-5">
                  <div className="flex justify-between text-sm">
                    <span className="font-body text-on-surface/50">
                      {cartSeats.length} ingresso{cartSeats.length > 1 ? "s" : ""}
                    </span>
                    <span className="font-body text-on-surface">{formatCurrency(subtotal)}</span>
                  </div>
                  {event && (
                    <div className="flex justify-between text-sm">
                      <span className="font-body text-on-surface/50">
                        Taxa ({event.serviceFeePercent}%)
                      </span>
                      <span className="font-body text-on-surface">{formatCurrency(fee)}</span>
                    </div>
                  )}
                  <div className="pt-3 border-t border-outline-variant flex justify-between">
                    <span className="font-display font-bold uppercase tracking-tight text-on-surface">
                      Total
                    </span>
                    <span className="font-display font-black text-xl tracking-tight text-on-surface">
                      {formatCurrency(total)}
                    </span>
                  </div>
                </div>

                <Button
                  fullWidth
                  size="lg"
                  disabled={countdown.isExpired}
                  onClick={() => router.push("/checkout")}
                >
                  Finalizar pedido
                </Button>

                <p className="text-[11px] text-on-surface/30 font-body text-center mt-3 leading-relaxed">
                  Pagamento com cartão de crédito. Pagamento seguro via Stripe.
                </p>
              </div>
            </aside>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
}
