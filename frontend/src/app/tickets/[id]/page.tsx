"use client";

import React from "react";
import Link from "next/link";
import MainLayout from "@/components/features/MainLayout";
import { TicketFace } from "@/components/features/tickets/TicketPass";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { TicketSkeleton } from "@/components/ui/Skeleton";
import { formatCurrency, formatDate, type Ticket } from "@/lib/mock-data";
import { useTicket } from "@/lib/tickets-api";
import { toast } from "sonner";

interface Props {
  params: Promise<{ id: string }>;
}

const STATUS_LABELS: Record<string, string> = {
  VALID: "Válido",
  USED: "Utilizado",
  CANCELLED: "Cancelado",
  EXPIRED: "Expirado",
};

const STATUS_VARIANTS: Record<string, "vibe" | "status" | "outline"> = {
  VALID: "vibe",
  USED: "status",
  CANCELLED: "outline",
  EXPIRED: "outline",
};

/** Returns "EXPIRED" when a VALID ticket's event date has already passed. */
function effectiveStatus(ticket: Ticket): string {
  if (
    ticket.status === "VALID" &&
    ticket.event?.startsAt &&
    new Date(ticket.event.startsAt) < new Date()
  ) {
    return "EXPIRED";
  }
  return ticket.status;
}

export default function TicketDetailPage({ params }: Props) {
  const resolvedParams = React.use(params);
  const ticketId = resolvedParams.id;
  const { data: ticket, isLoading } = useTicket(ticketId);

  const ev = ticket?.event;
  const seat = ticket?.seat;
  const effStatus = ticket ? effectiveStatus(ticket) : "";

  function handleDownloadPdf() {
    toast.success("Baixando ingresso em PDF…");
  }

  function handleTransfer() {
    toast.info("Funcionalidade de transferência em breve.");
  }

  function handleShare() {
    if (!ticket) return;
    if (navigator.share) {
      navigator.share({
        title: ev ? `Ingresso — ${ev.homeTeam} vs ${ev.awayTeam}` : "Meu Ingresso",
        text: ev ? `Meu ingresso para ${ev.homeTeam} vs ${ev.awayTeam}` : "Meu ingresso Catraca",
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copiado!");
    }
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto px-6 py-10">
          <TicketSkeleton />
        </div>
      </MainLayout>
    );
  }

  if (!ticket) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto px-6 py-10 text-center">
          <p className="font-display font-bold text-xl text-on-surface/30 uppercase">Ingresso não encontrado</p>
        </div>
      </MainLayout>
    );
  }

  const showQr = ticket.status === "VALID" && effStatus !== "EXPIRED";

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="flex items-center gap-2 mb-6 text-on-surface/40 text-xs font-body">
          <Link href="/tickets" className="hover:text-on-surface transition-colors">
            Meus ingressos
          </Link>
          <span>/</span>
          <span className="text-on-surface/60 truncate">
            {ev ? `${ev.homeTeam} vs ${ev.awayTeam}` : ticket.id.slice(0, 8).toUpperCase()}
          </span>
        </div>

        <div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
          {ev && <Badge label={ev.league} variant="vibe" />}
          <Badge label={STATUS_LABELS[effStatus]} variant={STATUS_VARIANTS[effStatus]} />
        </div>

        {effStatus === "EXPIRED" && (
          <p className="text-center text-sm text-on-surface/50 font-body mb-4 max-w-md mx-auto">
            Este ingresso não foi utilizado — o evento já aconteceu.
          </p>
        )}

        {ticket.status === "USED" && (
          <p className="text-center text-xs font-display font-semibold uppercase text-on-surface/40 mb-4">
            Ingresso utilizado
          </p>
        )}

        {ticket.status === "CANCELLED" && (
          <p className="text-center text-sm text-on-surface/50 font-body mb-4">Ingresso cancelado.</p>
        )}

        <div className="w-full max-w-[340px] mx-auto">
          <TicketFace ticket={ticket} showQr={showQr} />
        </div>

        {(seat || ticket.purchasedAt) && (
          <div className="mt-8 max-w-[340px] mx-auto grid grid-cols-2 gap-4 text-sm border-t border-outline-variant pt-6">
            {seat && (
              <div>
                <p className="text-[10px] font-body uppercase tracking-widest text-on-surface/30 mb-1">Valor pago</p>
                <p className="font-display font-bold text-on-surface">{formatCurrency(seat.priceCents)}</p>
              </div>
            )}
            <div>
              <p className="text-[10px] font-body uppercase tracking-widest text-on-surface/30 mb-1">Comprado em</p>
              <p className="font-body text-on-surface">{formatDate(ticket.purchasedAt)}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 mt-10 max-w-[340px] mx-auto">
          {ticket.status === "VALID" && effStatus !== "EXPIRED" && (
            <>
              <Button fullWidth onClick={handleDownloadPdf}>
                Baixar PDF
              </Button>
              <Button fullWidth variant="secondary" onClick={handleTransfer}>
                Transferir ingresso
              </Button>
            </>
          )}
          <Button fullWidth variant="secondary" onClick={handleShare}>
            Compartilhar
          </Button>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/tickets"
            className="text-sm font-body text-on-surface/40 hover:text-on-surface transition-colors underline underline-offset-2"
          >
            ← Voltar para meus ingressos
          </Link>
        </div>
      </div>
    </MainLayout>
  );
}
