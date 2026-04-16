"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface QrScannerModalProps {
  open: boolean;
  onClose: () => void;
  onDetected: (code: string) => void;
}

const TICKET_CODE_RE = /^CATRACA-TK-[A-Za-z0-9]+$/;
const READER_ELEMENT_ID = "admin-ticket-qr-reader";

export default function QrScannerModal({ open, onClose, onDetected }: QrScannerModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const detectedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    detectedRef.current = false;
    setError(null);
    let cancelled = false;
    let instance: { stop: () => Promise<void>; clear: () => void } | null = null;

    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;

        const html5Qr = new Html5Qrcode(READER_ELEMENT_ID, { verbose: false });
        instance = html5Qr;
        scannerRef.current = html5Qr;

        await html5Qr.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (width: number, height: number) => {
              const edge = Math.floor(Math.min(width, height) * 0.75);
              return { width: edge, height: edge };
            },
            aspectRatio: 1,
          },
          (decoded: string) => {
            if (detectedRef.current) return;
            const code = decoded.trim().toUpperCase();
            if (!TICKET_CODE_RE.test(code)) return;
            detectedRef.current = true;
            onDetected(code);
          },
          () => {
            // swallow per-frame decode errors
          }
        );
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error && err.name === "NotAllowedError"
            ? "Permissão de câmera negada. Digite o código manualmente."
            : "Não foi possível acessar a câmera. Digite o código manualmente.";
        setError(message);
      }
    })();

    return () => {
      cancelled = true;
      const active = instance ?? scannerRef.current;
      scannerRef.current = null;
      if (!active) return;
      active
        .stop()
        .catch(() => {})
        .finally(() => {
          try {
            active.clear();
          } catch {
            // ignore
          }
        });
    };
  }, [open, onDetected]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black"
      role="dialog"
      aria-modal="true"
      aria-label="Escanear QR do ingresso"
    >
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 text-white">
        <p className="font-display font-semibold text-sm uppercase tracking-tight">
          Escanear QR do Ingresso
        </p>
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors duration-150"
          aria-label="Fechar scanner"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        <div
          id={READER_ELEMENT_ID}
          className="w-full h-full [&_video]:object-cover [&_video]:w-full [&_video]:h-full"
        />

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center bg-black/85">
            <p className="font-body text-sm text-white max-w-xs">{error}</p>
            <button
              onClick={onClose}
              className="px-5 py-3 bg-gradient-to-br from-accent to-accent/85 text-on-accent font-display font-semibold text-sm rounded-sm"
            >
              Fechar
            </button>
          </div>
        )}
      </div>

      {!error && (
        <div className="px-4 py-4 bg-black/80 text-white/70 text-xs font-body text-center">
          Aponte a câmera para o QR do ingresso.
        </div>
      )}
    </div>,
    document.body
  );
}
