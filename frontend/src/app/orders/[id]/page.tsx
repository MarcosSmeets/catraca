"use client";

import { use } from "react";
import Link from "next/link";
import Image from "next/image";
import MainLayout from "@/components/features/MainLayout";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { mockOrders, formatCurrency, formatDate } from "@/lib/mock-data";

interface Props {
  params: Promise<{ id: string }>;
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  PAID: "Pago",
  PENDING: "Pendente",
  FAILED: "Falhou",
  REFUNDED: "Reembolsado",
};

const ORDER_STATUS_VARIANTS: Record<string, "vibe" | "status" | "outline"> = {
  PAID: "vibe",
  PENDING: "status",
  FAILED: "outline",
  REFUNDED: "outline",
};

export default function OrderPage({ params }: Props) {
  const { id } = use(params);
  const order = mockOrders.find((o) => o.id === id) ?? mockOrders[0];

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-body uppercase tracking-widest text-on-surface/40 mb-1">
            Confirmação
          </p>
          <h1 className="font-display font-black text-3xl md:text-4xl text-on-surface tracking-tight uppercase mb-2">
            Pedido confirmado
          </h1>
          <p className="text-sm font-body text-on-surface/50">
            Número do pedido:{" "}
            <span className="font-medium text-on-surface">#{id.toUpperCase()}</span>
          </p>
        </div>

        {/* Success banner */}
        <div className="bg-primary/10 border border-primary/20 rounded-md px-5 py-4 flex items-center gap-4 mb-8">
          <div className="w-10 h-10 bg-primary rounded-sm flex items-center justify-center shrink-0">
            <CheckIcon />
          </div>
          <div>
            <p className="font-display font-bold text-sm tracking-tight text-on-surface">
              Pagamento confirmado
            </p>
            <p className="text-xs font-body text-on-surface/50 mt-0.5">
              Seus ingressos foram enviados para o seu e-mail.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {/* Event card */}
          <div className="bg-surface-lowest rounded-md overflow-hidden">
            <div className="relative h-40 bg-surface-dim">
              <Image
                src={order.event.imageUrl}
                alt={order.event.title}
                fill
                className="object-cover opacity-60"
                sizes="800px"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-transparent" />
              <div className="absolute bottom-5 left-5">
                <p className="text-xs text-on-primary/60 font-body uppercase tracking-widest">
                  {order.event.league}
                </p>
                <p className="font-display font-bold text-lg text-on-primary tracking-tight">
                  {order.event.homeTeam}{" "}
                  <span className="opacity-50">vs</span>{" "}
                  {order.event.awayTeam}
                </p>
                <p className="text-xs text-on-primary/50 font-body mt-0.5">
                  {formatDate(order.event.startsAt)} · {order.event.venue.name}
                </p>
              </div>
            </div>

            {/* Seat list */}
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-xs uppercase tracking-widest text-on-surface/40">
                  Ingressos ({order.seats.length})
                </h2>
                <Badge
                  label={ORDER_STATUS_LABELS[order.status]}
                  variant={ORDER_STATUS_VARIANTS[order.status]}
                />
              </div>
              <div className="divide-y divide-outline-variant">
                {order.seats.map((seat) => (
                  <div key={seat.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-body font-medium text-sm text-on-surface">
                        {seat.section}
                      </p>
                      <p className="text-xs text-on-surface/40 font-body">
                        Fileira {seat.row} · Assento {seat.number}
                      </p>
                    </div>
                    <span className="font-display font-bold text-sm text-on-surface tracking-tight">
                      {formatCurrency(seat.priceCents)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order summary */}
          <div className="bg-surface-lowest rounded-md p-5">
            <h2 className="font-display font-bold text-xs uppercase tracking-widest text-on-surface/40 mb-4">
              Resumo financeiro
            </h2>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-sm">
                <span className="font-body text-on-surface/50">
                  {order.seats.length} ingresso{order.seats.length > 1 ? "s" : ""}
                </span>
                <span className="font-body text-on-surface">
                  {formatCurrency(order.seats.reduce((s, seat) => s + seat.priceCents, 0))}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-body text-on-surface/50">Taxa de serviço</span>
                <span className="font-body text-on-surface">
                  {formatCurrency(order.totalCents - order.seats.reduce((s, seat) => s + seat.priceCents, 0))}
                </span>
              </div>
              <div className="pt-3 border-t border-outline-variant flex justify-between">
                <span className="font-display font-bold uppercase tracking-tight text-on-surface">
                  Total pago
                </span>
                <span className="font-display font-black text-xl tracking-tight text-on-surface">
                  {formatCurrency(order.totalCents)}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/tickets" className="flex-1">
              <Button fullWidth>Ver meus ingressos</Button>
            </Link>
            <Link href="/search" className="flex-1">
              <Button fullWidth variant="secondary">Explorar mais eventos</Button>
            </Link>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
