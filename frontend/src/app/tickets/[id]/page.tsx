"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import MainLayout from "@/components/features/MainLayout";
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
  const { data: ticket, isLoading } = useTicket(resolvedParams.id);

  const ev = ticket?.event;
  const seat = ticket?.seat;
  const effStatus = ticket ? effectiveStatus(ticket) : "";
  const initialEventImage =
    ev?.imageUrl && ev.imageUrl.startsWith("http")
      ? ev.imageUrl
      : "/placeholder-event.svg";
  const [eventImgSrc, setEventImgSrc] = useState(initialEventImage);

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

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-8 text-on-surface/40 text-xs font-body">
          <Link href="/tickets" className="hover:text-on-surface transition-colors">
            Meus ingressos
          </Link>
          <span>/</span>
          <span className="text-on-surface/60 truncate">
            {ev ? `${ev.homeTeam} vs ${ev.awayTeam}` : ticket.id.slice(0, 8).toUpperCase()}
          </span>
        </div>

        {/* Ticket card */}
        <div className="bg-surface-lowest rounded-md overflow-hidden shadow-sm">
          {/* Event image header */}
          <div className="relative h-48 bg-surface-dim">
            <Image
              src={eventImgSrc}
              alt={ev ? `${ev.homeTeam} vs ${ev.awayTeam}` : "Ingresso"}
              fill
              className={`object-cover ${effStatus === "EXPIRED" ? "opacity-60 grayscale" : ""}`}
              sizes="768px"
              priority
              onError={() => setEventImgSrc("/placeholder-event.svg")}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/30 to-primary/80" />
            <div className="absolute bottom-5 left-5 right-5">
              <div className="flex items-center gap-2 mb-2">
                {ev && <Badge label={ev.league} variant="vibe" />}
                <Badge
                  label={STATUS_LABELS[effStatus]}
                  variant={STATUS_VARIANTS[effStatus]}
                />
              </div>
              {ev && (
                <h1 className="font-display font-black text-xl text-on-primary tracking-tight">
                  {ev.homeTeam}{" "}
                  <span className="opacity-50 font-normal">vs</span>{" "}
                  {ev.awayTeam}
                </h1>
              )}
            </div>
          </div>

          {/* Ticket body */}
          <div className="p-6">
            {/* QR Code — shown for all VALID tickets regardless of event date */}
            {ticket.status === "VALID" && (
              <div className="flex flex-col items-center gap-3 mb-8 py-6 border-b border-dashed border-outline-variant">
                <div className="w-44 h-44 bg-surface-low rounded-sm overflow-hidden flex items-center justify-center p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${ticket.qrCode}`}
                    alt="QR Code do ingresso"
                    className="w-full h-full object-contain"
                  />
                </div>
                <p className="text-xs font-body uppercase tracking-widest text-on-surface/30 text-center">
                  Apresente na entrada
                </p>
                <p className="text-[10px] font-body text-on-surface/20 font-mono">
                  {ticket.qrCode}
                </p>
              </div>
            )}

            {/* Used — show when/where it was used */}
            {ticket.status === "USED" && (
              <div className="mb-8 py-4 px-5 bg-surface-low rounded-sm text-center flex flex-col gap-1">
                <p className="text-xs font-display font-semibold uppercase tracking-tight text-on-surface/40">
                  Ingresso utilizado
                </p>
                <p className="text-[10px] font-body text-on-surface/30 font-mono mt-1">
                  {ticket.qrCode}
                </p>
              </div>
            )}

            {/* Expired notice — event passed but ticket was never used */}
            {effStatus === "EXPIRED" && (
              <div className="mb-8 py-4 px-5 bg-surface-low rounded-sm border border-outline-variant text-center flex flex-col gap-1">
                <p className="text-sm font-body text-on-surface/50">
                  Este ingresso não foi utilizado — o evento já aconteceu.
                </p>
                <p className="text-[10px] font-body text-on-surface/20 font-mono mt-1">
                  {ticket.qrCode}
                </p>
              </div>
            )}

            {/* Event details */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              {ev && (
                <>
                  <div>
                    <p className="text-[10px] font-body uppercase tracking-widest text-on-surface/30 mb-1">
                      Data
                    </p>
                    <p className="text-sm font-body font-medium text-on-surface">
                      {formatDate(ev.startsAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-body uppercase tracking-widest text-on-surface/30 mb-1">
                      Local
                    </p>
                    <p className="text-sm font-body font-medium text-on-surface">
                      {ev.venueName}
                    </p>
                    <p className="text-xs text-on-surface/40 font-body">
                      {ev.venueCity}
                    </p>
                  </div>
                </>
              )}
              {seat && (
                <>
                  <div>
                    <p className="text-[10px] font-body uppercase tracking-widest text-on-surface/30 mb-1">
                      Setor
                    </p>
                    <p className="text-sm font-body font-medium text-on-surface">
                      {seat.section}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-body uppercase tracking-widest text-on-surface/30 mb-1">
                      Assento
                    </p>
                    <p className="text-sm font-body font-medium text-on-surface">
                      Fileira {seat.row} · Nº {seat.number}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-body uppercase tracking-widest text-on-surface/30 mb-1">
                      Valor pago
                    </p>
                    <p className="text-sm font-display font-bold text-on-surface tracking-tight">
                      {formatCurrency(seat.priceCents)}
                    </p>
                  </div>
                </>
              )}
              <div>
                <p className="text-[10px] font-body uppercase tracking-widest text-on-surface/30 mb-1">
                  Comprado em
                </p>
                <p className="text-sm font-body text-on-surface">
                  {formatDate(ticket.purchasedAt)}
                </p>
              </div>
            </div>

            {/* Actions — PDF and transfer only for upcoming valid tickets */}
            <div className="flex flex-col gap-3">
              {ticket.status === "VALID" && (
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
          </div>
        </div>

        <div className="mt-6 text-center">
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
