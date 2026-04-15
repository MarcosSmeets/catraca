"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { TicketQr } from "@/components/features/tickets/TicketQr";
import MainLayout from "@/components/features/MainLayout";
import Badge from "@/components/ui/Badge";
import { TicketSkeleton } from "@/components/ui/Skeleton";
import { formatCurrency, formatDate, type Ticket } from "@/lib/mock-data";
import { useTickets } from "@/lib/tickets-api";

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

function TicketsPaidToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    if (searchParams.get("paid") !== "1" || handled.current) return;
    handled.current = true;
    toast.success("Compra confirmada.");
    router.replace("/tickets", { scroll: false });
  }, [searchParams, router]);

  return null;
}

export default function TicketsPage() {
  const { data: tickets = [], isLoading } = useTickets();
  const upcoming = tickets.filter((t) => effectiveStatus(t) === "VALID");
  const past = tickets.filter((t) => effectiveStatus(t) !== "VALID");

  return (
    <MainLayout>
      <Suspense fallback={null}>
        <TicketsPaidToast />
      </Suspense>
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-10">
          <p className="text-xs font-body uppercase tracking-widest text-on-surface/40 mb-1">
            Sua conta
          </p>
          <h1 className="font-display font-black text-3xl md:text-4xl text-on-surface tracking-tight uppercase">
            Meus ingressos
          </h1>
        </div>

        {/* ── Upcoming ──────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 2 }).map((_, i) => <TicketSkeleton key={i} />)}
          </div>
        ) : upcoming.length > 0 && (
          <section className="mb-10">
            <h2 className="font-display font-bold text-xs uppercase tracking-widest text-on-surface/40 mb-4">
              Próximos eventos
            </h2>
            <div className="flex flex-col gap-4">
              {upcoming.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} showQr />
              ))}
            </div>
          </section>
        )}

        {/* ── Past ──────────────────────────────────────────────────────── */}
        {!isLoading && past.length > 0 && (
          <section>
            <h2 className="font-display font-bold text-xs uppercase tracking-widest text-on-surface/40 mb-4">
              Histórico
            </h2>
            <div className="flex flex-col gap-4">
              {past.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} showQr={false} />
              ))}
            </div>
          </section>
        )}

        {!isLoading && tickets.length === 0 && (
          <div className="bg-surface-lowest rounded-md p-16 text-center">
            <p className="font-display font-bold text-xl text-on-surface/20 tracking-tight uppercase">
              Nenhum ingresso
            </p>
            <p className="text-sm text-on-surface/30 font-body mt-2">
              Compre seu primeiro ingresso e ele aparecerá aqui.
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

function TicketCard({
  ticket,
  showQr,
}: {
  ticket: Ticket;
  showQr: boolean;
}) {
  const ev = ticket.event;
  const seat = ticket.seat;
  const effStatus = effectiveStatus(ticket);
  const initialImage =
    ev?.imageUrl && ev.imageUrl.startsWith("http")
      ? ev.imageUrl
      : "/placeholder-event.svg";
  const [imgSrc, setImgSrc] = useState(initialImage);

  const qrData = ticket.qrCode || "INVALIDO";

  return (
    <div className="bg-surface-lowest rounded-md overflow-hidden flex flex-col sm:flex-row">
      {/* Left — event image strip */}
      <div className="relative w-full sm:w-48 h-36 sm:h-auto bg-surface-dim shrink-0">
        <Image
          src={imgSrc}
          alt={ev ? `${ev.homeTeam} vs ${ev.awayTeam}` : "Ingresso"}
          fill
          className={`object-cover ${effStatus === "EXPIRED" ? "opacity-50 grayscale" : ""}`}
          sizes="(max-width: 640px) 100vw, 192px"
          onError={() => setImgSrc("/placeholder-event.svg")}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/30 to-primary/60" />
        {ev && (
          <div className="absolute bottom-3 left-3">
            <Badge label={ev.league} variant="vibe" />
          </div>
        )}
      </div>

      {/* Middle — info */}
      <div className="flex-1 p-5 flex flex-col justify-between min-w-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge
              label={STATUS_LABELS[effStatus]}
              variant={STATUS_VARIANTS[effStatus]}
            />
          </div>
          <h3 className="font-display font-bold text-base text-on-surface tracking-tight leading-tight mt-2">
            {ev ? (
              <>
                {ev.homeTeam}{" "}
                <span className="text-on-surface/40 font-normal">vs</span>{" "}
                {ev.awayTeam}
              </>
            ) : (
              <span className="text-on-surface/40">Evento</span>
            )}
          </h3>
          {ev && (
            <p className="text-xs text-on-surface/40 font-body mt-1">
              {formatDate(ev.startsAt)} · {ev.venueName}, {ev.venueCity}
            </p>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-x-8 gap-y-1">
          {seat && (
            <>
              <div>
                <p className="text-[10px] font-body uppercase tracking-widest text-on-surface/30">
                  Setor
                </p>
                <p className="text-sm font-body font-medium text-on-surface">
                  {seat.section}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-body uppercase tracking-widest text-on-surface/30">
                  Fileira
                </p>
                <p className="text-sm font-body font-medium text-on-surface">
                  {seat.row}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-body uppercase tracking-widest text-on-surface/30">
                  Assento
                </p>
                <p className="text-sm font-body font-medium text-on-surface">
                  {seat.number}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-body uppercase tracking-widest text-on-surface/30">
                  Valor
                </p>
                <p className="text-sm font-display font-bold text-on-surface tracking-tight">
                  {formatCurrency(seat.priceCents)}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right — QR code (only for truly upcoming valid tickets) */}
      {showQr && effStatus === "VALID" && (
        <div className="sm:border-l border-t sm:border-t-0 border-outline-variant p-5 flex flex-col items-center justify-center gap-2 shrink-0">
          <div className="w-28 h-28 rounded-sm overflow-hidden flex items-center justify-center">
            <TicketQr value={qrData} size={112} />
          </div>
          <p className="text-[10px] font-body uppercase tracking-widest text-on-surface/30 text-center">
            Apresente na entrada
          </p>
          <Link
            href={`/tickets/${ticket.id}`}
            className="text-xs font-body text-on-surface/40 hover:text-on-surface transition-colors underline underline-offset-2 mt-1"
          >
            Ver detalhe
          </Link>
        </div>
      )}

      {/* Expired — link to detail without QR */}
      {effStatus === "EXPIRED" && (
        <div className="sm:border-l border-t sm:border-t-0 border-outline-variant p-5 flex items-center justify-center shrink-0">
          <Link
            href={`/tickets/${ticket.id}`}
            className="text-xs font-body text-on-surface/40 hover:text-on-surface transition-colors underline underline-offset-2"
          >
            Ver detalhe
          </Link>
        </div>
      )}
    </div>
  );
}
