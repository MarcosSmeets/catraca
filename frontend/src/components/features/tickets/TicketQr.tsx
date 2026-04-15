"use client";

import QRCode from "react-qr-code";

type Props = {
  value: string;
  size: number;
  className?: string;
};

/** Renders a QR code from the ticket payload (no external image API). */
export function TicketQr({ value, size, className }: Props) {
  return (
    <div
      className={`bg-white flex items-center justify-center ${className ?? ""}`}
      style={{ width: size, height: size }}
    >
      <QRCode
        value={value}
        size={size - 16}
        level="M"
        fgColor="#0a0a0a"
        bgColor="#ffffff"
        title="Código do ingresso"
      />
    </div>
  );
}
