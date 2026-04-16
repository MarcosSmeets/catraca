"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { adminScanTicket, type ScanTicketResult } from "@/lib/admin-api";
import { ApiError } from "@/lib/api";
import QrScannerModal from "@/components/features/tickets/QrScannerModal";

type ScanState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; ticket: ScanTicketResult }
  | { kind: "already_used"; ticket: ScanTicketResult; usedAt: string }
  | { kind: "cancelled" }
  | { kind: "not_found" }
  | { kind: "error"; message: string };

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ScanTicketPage() {
  const [qrCode, setQrCode] = useState("");
  const [state, setState] = useState<ScanState>({ kind: "idle" });
  const [isMobile, setIsMobile] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasCamera = Boolean(navigator.mediaDevices?.getUserMedia);
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    setIsMobile(hasCamera && coarsePointer);
  }, []);

  const handleScan = useCallback(async (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) return;

    setState({ kind: "loading" });

    try {
      const ticket = await adminScanTicket(code);
      setState({ kind: "ok", ticket });
      setQrCode("");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 404) {
          setState({ kind: "not_found" });
        } else if (err.status === 409) {
          const body = err.data as { error: string; ticket?: ScanTicketResult } | undefined;
          if (body?.ticket?.usedAt) {
            setState({ kind: "already_used", ticket: body.ticket, usedAt: body.ticket.usedAt });
          } else {
            setState({ kind: "cancelled" });
          }
        } else {
          setState({ kind: "error", message: err.message });
        }
      } else {
        setState({ kind: "error", message: "Erro inesperado. Tente novamente." });
      }
    } finally {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, []);

  const handleDetected = useCallback(
    (code: string) => {
      setScannerOpen(false);
      setQrCode(code);
      void handleScan(code);
    },
    [handleScan]
  );

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") void handleScan(qrCode);
  }

  function handleReset() {
    setState({ kind: "idle" });
    setQrCode("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  const isLoading = state.kind === "loading";

  return (
    <div className="flex flex-col gap-8 max-w-lg">
      {/* Header */}
      <div>
        <h1 className="font-display font-black text-3xl text-on-surface tracking-tight">
          Validar Ingresso
        </h1>
        <p className="text-on-surface/50 font-body text-sm mt-1">
          Digite ou cole o código do ingresso para validar na entrada.
        </p>
      </div>

      {/* Scanner (mobile only) */}
      {isMobile && (
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setScannerOpen(true)}
            disabled={isLoading}
            className="w-full px-5 py-4 bg-gradient-to-br from-accent to-accent/85 text-on-accent font-display font-semibold text-sm rounded-sm flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity duration-150"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 7V5a2 2 0 0 1 2-2h2" />
              <path d="M17 3h2a2 2 0 0 1 2 2v2" />
              <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
              <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
              <rect x="7" y="7" width="10" height="10" rx="1" />
            </svg>
            Escanear QR Code
          </button>
          <div className="flex items-center gap-3 text-[10px] font-display font-semibold uppercase tracking-tight text-on-surface/30">
            <span className="flex-1 border-t border-outline-variant" />
            ou digite manualmente
            <span className="flex-1 border-t border-outline-variant" />
          </div>
        </div>
      )}

      {/* Input */}
      <div className="flex flex-col gap-3">
        <label className="text-xs font-display font-semibold uppercase tracking-tight text-on-surface/50">
          Código do Ingresso
        </label>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            autoFocus
            value={qrCode}
            onChange={(e) => setQrCode(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="CATRACA-TK-XXXXXXXX"
            className="flex-1 px-4 py-3 bg-surface-lowest border border-outline-variant rounded-sm font-body text-sm text-on-surface placeholder:text-on-surface/30 focus:outline-none focus:border-accent disabled:opacity-50 tracking-widest"
            spellCheck={false}
          />
          <button
            onClick={() => void handleScan(qrCode)}
            disabled={isLoading || !qrCode.trim()}
            className="px-5 py-3 bg-gradient-to-br from-accent to-accent/85 text-on-accent font-display font-semibold text-sm rounded-sm disabled:opacity-40 transition-opacity duration-150"
          >
            {isLoading ? "..." : "Validar"}
          </button>
        </div>
      </div>

      <QrScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={handleDetected}
      />

      {/* Feedback */}
      {state.kind === "ok" && (
        <div className="bg-surface-low rounded-sm overflow-hidden">
          {/* Status banner */}
          <div className="px-5 py-3 bg-accent flex items-center gap-3">
            <span className="text-on-accent text-lg">✓</span>
            <div>
              <p className="font-display font-black text-on-accent text-sm uppercase tracking-tight">
                Ingresso Válido
              </p>
              <p className="text-on-accent/80 text-xs font-body">
                Acesso liberado
              </p>
            </div>
          </div>

          {/* Ticket details */}
          <div className="px-5 py-4 flex flex-col gap-3">
            {state.ticket.event && (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-display font-semibold uppercase tracking-tight text-on-surface/40">
                  Evento
                </span>
                <p className="font-display font-bold text-on-surface text-base">
                  {state.ticket.event.homeTeam} × {state.ticket.event.awayTeam}
                </p>
                <p className="text-on-surface/60 font-body text-sm">
                  {state.ticket.event.league} &middot; {state.ticket.event.venueName},{" "}
                  {state.ticket.event.venueCity}
                </p>
                <p className="text-on-surface/50 font-body text-xs">
                  {formatDate(state.ticket.event.startsAt)}
                </p>
              </div>
            )}

            {state.ticket.seat && (
              <div className="flex gap-6 pt-1">
                <div>
                  <span className="text-xs font-display font-semibold uppercase tracking-tight text-on-surface/40 block">
                    Setor
                  </span>
                  <span className="font-display font-bold text-on-surface">
                    {state.ticket.seat.section}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-display font-semibold uppercase tracking-tight text-on-surface/40 block">
                    Fileira
                  </span>
                  <span className="font-display font-bold text-on-surface">
                    {state.ticket.seat.row}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-display font-semibold uppercase tracking-tight text-on-surface/40 block">
                    Assento
                  </span>
                  <span className="font-display font-bold text-on-surface">
                    {state.ticket.seat.number}
                  </span>
                </div>
              </div>
            )}

            <div className="pt-1 border-t border-outline-variant">
              <span className="text-xs font-body text-on-surface/40">
                Código: {state.ticket.qrCode}
              </span>
            </div>
          </div>

          <div className="px-5 pb-4">
            <button
              onClick={handleReset}
              className="text-xs font-display font-semibold text-on-surface/50 hover:text-accent transition-colors duration-150"
            >
              ← Validar outro ingresso
            </button>
          </div>
        </div>
      )}

      {state.kind === "already_used" && (
        <div className="bg-surface-low rounded-sm overflow-hidden">
          <div className="px-5 py-3 bg-error flex items-center gap-3">
            <span className="text-white text-lg">✕</span>
            <div>
              <p className="font-display font-black text-white text-sm uppercase tracking-tight">
                Ingresso Já Utilizado
              </p>
              <p className="text-white/70 text-xs font-body">
                Utilizado em {formatDate(state.usedAt)}
              </p>
            </div>
          </div>
          <div className="px-5 py-4">
            <button
              onClick={handleReset}
              className="text-xs font-display font-semibold text-on-surface/50 hover:text-accent transition-colors duration-150"
            >
              ← Tentar novamente
            </button>
          </div>
        </div>
      )}

      {state.kind === "cancelled" && (
        <div className="bg-surface-low rounded-sm overflow-hidden">
          <div className="px-5 py-3 bg-error flex items-center gap-3">
            <span className="text-white text-lg">✕</span>
            <div>
              <p className="font-display font-black text-white text-sm uppercase tracking-tight">
                Ingresso Cancelado
              </p>
              <p className="text-white/70 text-xs font-body">
                Este ingresso foi cancelado e não pode ser utilizado.
              </p>
            </div>
          </div>
          <div className="px-5 py-4">
            <button
              onClick={handleReset}
              className="text-xs font-display font-semibold text-on-surface/50 hover:text-accent transition-colors duration-150"
            >
              ← Tentar novamente
            </button>
          </div>
        </div>
      )}

      {state.kind === "not_found" && (
        <div className="bg-surface-low rounded-sm overflow-hidden">
          <div className="px-5 py-3 bg-primary-container flex items-center gap-3">
            <span className="text-on-primary text-lg">?</span>
            <div>
              <p className="font-display font-black text-on-primary text-sm uppercase tracking-tight">
                Ingresso Não Encontrado
              </p>
              <p className="text-on-primary/70 text-xs font-body">
                Verifique o código e tente novamente.
              </p>
            </div>
          </div>
          <div className="px-5 py-4">
            <button
              onClick={handleReset}
              className="text-xs font-display font-semibold text-on-surface/50 hover:text-accent transition-colors duration-150"
            >
              ← Tentar novamente
            </button>
          </div>
        </div>
      )}

      {state.kind === "error" && (
        <div className="bg-error/5 border border-error/20 rounded-sm px-4 py-3">
          <p className="text-sm font-body text-error">{state.message}</p>
          <button
            onClick={handleReset}
            className="text-xs font-display font-semibold text-on-surface/50 hover:text-accent transition-colors duration-150 mt-2 block"
          >
            ← Tentar novamente
          </button>
        </div>
      )}

      {/* Usage hint */}
      {state.kind === "idle" && (
        <p className="text-xs font-body text-on-surface/30">
          Pressione Enter ou clique em Validar para confirmar o ingresso.
        </p>
      )}
    </div>
  );
}
