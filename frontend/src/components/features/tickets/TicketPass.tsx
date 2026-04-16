"use client";

import Image from "next/image";
import type { Ticket } from "@/lib/mock-data";
import { TicketQr } from "./TicketQr";

function formatTicketWhen(iso: string): string {
  const d = new Date(iso);
  const datePart = new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: "America/Sao_Paulo",
  }).format(d);
  const timePart = new Intl.DateTimeFormat("pt-BR", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(d);
  return `${datePart} | ${timePart}`;
}

function ZigZagBorder({ flip }: { flip?: boolean }) {
  return (
    <svg
      className={`w-full h-2.5 text-surface-lowest shrink-0 ${flip ? "rotate-180" : ""}`}
      viewBox="0 0 320 10"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M0 10V5 L8 0 L16 5 L24 0 L32 5 L40 0 L48 5 L56 0 L64 5 L72 0 L80 5 L88 0 L96 5 L104 0 L112 5 L120 0 L128 5 L136 0 L144 5 L152 0 L160 5 L168 0 L176 5 L184 0 L192 5 L200 0 L208 5 L216 0 L224 5 L232 0 L240 5 L248 0 L256 5 L264 0 L272 5 L280 0 L288 5 L296 0 L304 5 L312 0 L320 5 V10z"
      />
    </svg>
  );
}

type TicketFaceProps = {
  ticket: Ticket;
  /** When false, QR block shows placeholder message */
  showQr: boolean;
};

/** Visual ticket pass (reference layout: premium strip, branding, event block, pink band, QR, seat line). */
export function TicketFace({ ticket, showQr }: TicketFaceProps) {
  const ev = ticket.event;
  const seat = ticket.seat;
  const title =
    ev && ev.homeTeam && ev.awayTeam
      ? `${ev.homeTeam} vs ${ev.awayTeam}`
      : "Evento";
  const when = ev?.startsAt ? formatTicketWhen(ev.startsAt) : "—";
  const venue = ev?.venueName ?? "—";
  const seatLine =
    seat != null
      ? `SETOR ${seat.section}  FILEIRA ${seat.row}  ASSENTO ${seat.number}`
      : "—";

  return (
    <div className="w-[min(100%,340px)] mx-auto bg-surface-lowest text-on-surface shadow-[0_12px_40px_rgba(0,0,0,0.35)] rounded-sm overflow-hidden border border-outline-variant/30">
      <ZigZagBorder />
      <div className="bg-[#0a0a0a] text-center py-2.5 px-3">
        <span className="font-display font-bold text-[11px] tracking-[0.35em] text-white uppercase">
          Premium
        </span>
      </div>

      <div className="bg-white px-5 pt-5 pb-4 border-b-2 border-accent">
        <div className="flex flex-col items-center gap-3">
          <Image
            src="/logo.png"
            alt="Catraca"
            width={120}
            height={48}
            className="h-10 w-auto object-contain"
          />
          <p className="font-display font-black text-2xl tracking-tight text-[#0a0a0a] uppercase">
            CATR<span className="text-accent">A</span>C<span className="text-accent">A</span>
          </p>
        </div>
      </div>

      <div className="relative bg-[#141416] px-4 py-5 text-white">
        <p className="font-display font-black text-base sm:text-lg text-center uppercase tracking-tight leading-snug">
          {title}
        </p>
        <p className="mt-2 text-center text-sm text-white/95 font-body">{when}</p>
        <p className="mt-1 text-center text-xs text-white/55 font-body">{venue}</p>
      </div>

      <div className="relative bg-accent h-3">
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-7 rounded-r-full bg-[#141416]"
          aria-hidden
        />
        <span
          className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-7 rounded-l-full bg-[#141416]"
          aria-hidden
        />
      </div>

      <div className="bg-[#141416] px-4 pt-5 pb-4 flex flex-col items-center">
        {showQr ? (
          <>
            <TicketQr value={ticket.qrCode} size={200} className="rounded-sm" />
            <p className="mt-3 text-[10px] font-mono text-white/50 text-center break-all max-w-full px-1">
              {ticket.qrCode}
            </p>
          </>
        ) : (
          <div className="py-8 px-4 text-center text-white/45 text-sm font-body">
            QR indisponível para este status.
          </div>
        )}
      </div>

      <div className="bg-[#141416] px-4 pb-5 pt-0">
        <p className="text-center text-[11px] sm:text-xs font-display font-semibold tracking-wide text-white uppercase">
          {seatLine}
        </p>
      </div>

      <ZigZagBorder flip />
    </div>
  );
}
