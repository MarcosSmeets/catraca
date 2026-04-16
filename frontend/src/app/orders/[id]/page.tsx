"use client";

import React from "react";
import Link from "next/link";
import MainLayout from "@/components/features/MainLayout";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/mock-data";
import { useOrder } from "@/lib/orders-api";

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
  const { id } = React.use(params);
  const { data: order, isLoading } = useOrder(id);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="max-w-3xl mx-auto px-6 py-10">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-surface-dim rounded-sm w-1/3" />
            <div className="h-40 bg-surface-dim rounded-md" />
            <div className="h-32 bg-surface-dim rounded-md" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!order) {
    return (
      <MainLayout>
        <div className="max-w-3xl mx-auto px-6 py-10 text-center">
          <p className="font-display font-bold text-xl text-on-surface/30 uppercase">Pedido não encontrado</p>
          <Link href="/profile" className="text-sm text-on-surface/40 underline underline-offset-2 mt-4 block">
            Ver meus pedidos
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-body uppercase tracking-widest text-on-surface/40 mb-1">
            Confirmação
          </p>
          <h1 className="font-display font-black text-3xl md:text-4xl text-on-surface tracking-tight uppercase mb-2">
            Pedido
          </h1>
          <p className="text-sm font-body text-on-surface/50">
            Número do pedido:{" "}
            <span className="font-medium text-on-surface">#{id.slice(0, 8).toUpperCase()}</span>
          </p>
        </div>

        {/* Status banner */}
        {order.status === "PAID" && (
          <div className="bg-accent/10 border border-accent/20 rounded-md px-5 py-4 flex items-center gap-4 mb-8">
            <div className="w-10 h-10 bg-accent rounded-sm flex items-center justify-center shrink-0">
              <CheckIcon />
            </div>
            <div>
              <p className="font-display font-bold text-sm tracking-tight text-on-surface">
                Pagamento confirmado
              </p>
              <p className="text-xs font-body text-on-surface/50 mt-0.5">
                Seus ingressos foram gerados e estão disponíveis em &ldquo;Meus Ingressos&rdquo;.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-6">
          {/* Order summary */}
          <div className="bg-surface-lowest rounded-md p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-xs uppercase tracking-widest text-on-surface/40">
                Resumo do pedido
              </h2>
              <Badge
                label={ORDER_STATUS_LABELS[order.status] ?? order.status}
                variant={ORDER_STATUS_VARIANTS[order.status] ?? "outline"}
              />
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between text-sm">
                <span className="font-body text-on-surface/50">
                  {order.reservationIds.length} ingresso{order.reservationIds.length > 1 ? "s" : ""}
                </span>
                <span className="font-body text-on-surface">—</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-body text-on-surface/50">Data</span>
                <span className="font-body text-on-surface">
                  {new Date(order.createdAt).toLocaleDateString("pt-BR")}
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
