"use client";

import { useState, useMemo, useCallback } from "react";
import { Seat, formatCurrency } from "@/lib/mock-data";

interface SeatMapProps {
  seats: Seat[];
  onSelectionChange: (selected: Seat[]) => void;
  maxSelectable?: number;
}

type SectionMap = Record<string, Seat[][]>;

export default function SeatMap({
  seats,
  onSelectionChange,
  maxSelectable = 6,
}: SeatMapProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const sections = useMemo<SectionMap>(() => {
    const map: SectionMap = {};
    seats.forEach((seat) => {
      if (!map[seat.section]) map[seat.section] = [];
      if (!map[seat.section][seat.rowIndex])
        map[seat.section][seat.rowIndex] = [];
      map[seat.section][seat.rowIndex][seat.col] = seat;
    });
    return map;
  }, [seats]);

  const sectionNames = Object.keys(sections);
  const displaySection = activeSection ?? sectionNames[0];

  const toggleSeat = useCallback(
    (seat: Seat) => {
      if (seat.status !== "AVAILABLE") return;
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(seat.id)) {
          next.delete(seat.id);
        } else {
          if (next.size >= maxSelectable) return prev;
          next.add(seat.id);
        }
        const selectedSeats = seats.filter((s) => next.has(s.id));
        onSelectionChange(selectedSeats);
        return next;
      });
    },
    [seats, maxSelectable, onSelectionChange]
  );

  const seatRows = sections[displaySection] ?? [];
  const sectionSeats = Object.values(sections[displaySection] ?? []).flat();
  const availableCount = sectionSeats.filter((s) => s?.status === "AVAILABLE").length;
  const sectionPrice = sectionSeats.find((s) => s?.status === "AVAILABLE")?.priceCents;

  return (
    <div className="flex flex-col gap-6">
      {/* Section selector */}
      <div>
        <p
          id="section-label"
          className="text-xs font-display font-semibold uppercase tracking-tight text-on-surface/50 mb-3"
        >
          Setor
        </p>
        <div
          className="flex flex-wrap gap-2"
          role="radiogroup"
          aria-labelledby="section-label"
        >
          {sectionNames.map((name) => {
            const sSeats = Object.values(sections[name]).flat();
            const avail = sSeats.filter((s) => s?.status === "AVAILABLE").length;
            const price = sSeats.find((s) => s?.status === "AVAILABLE")?.priceCents;
            const isActive = displaySection === name;
            return (
              <button
                key={name}
                role="radio"
                aria-checked={isActive}
                onClick={() => setActiveSection(name)}
                disabled={avail === 0}
                className={[
                  "px-4 py-2.5 rounded-sm text-xs font-body transition-colors duration-150 text-left",
                  isActive
                    ? "bg-primary text-on-primary"
                    : avail === 0
                    ? "bg-surface-dim text-on-surface/30 cursor-not-allowed"
                    : "bg-surface-lowest border border-outline-variant text-on-surface hover:border-primary",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className="font-semibold block">{name}</span>
                {price ? (
                  <span className="text-[10px] opacity-70">
                    {formatCurrency(price)}
                    {avail > 0 ? ` · ${avail} disp.` : ""}
                  </span>
                ) : (
                  <span className="text-[10px] opacity-50">Esgotado</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stage indicator */}
      <div className="flex flex-col items-center gap-1" aria-hidden="true">
        <div className="w-full max-w-xs h-1.5 bg-primary/20 rounded-none" />
        <span className="text-[10px] font-body uppercase tracking-widest text-on-surface/30">
          Campo / Palco
        </span>
      </div>

      {/* Seat grid */}
      <div
        className="overflow-x-auto"
        role="grid"
        aria-label={`Mapa de assentos — Setor ${displaySection}. ${availableCount} disponíveis. Máximo ${maxSelectable} por pedido.`}
      >
        <div className="flex flex-col gap-1.5 min-w-fit mx-auto w-fit">
          {seatRows.map((row, rIdx) => (
            <div key={rIdx} className="flex gap-1.5 items-center" role="row">
              <span
                className="text-[10px] font-body text-on-surface/30 w-4 shrink-0 text-right"
                role="rowheader"
                aria-label={`Fileira ${row[0]?.row ?? rIdx + 1}`}
              >
                {row[0]?.row ?? ""}
              </span>
              {row.map((seat, cIdx) =>
                seat ? (
                  <SeatButton
                    key={seat.id}
                    seat={seat}
                    isSelected={selected.has(seat.id)}
                    onToggle={toggleSeat}
                  />
                ) : (
                  <div key={cIdx} className="w-6 h-6" role="gridcell" aria-hidden="true" />
                )
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4" role="list" aria-label="Legenda">
        {[
          { color: "bg-surface-high border border-outline-variant", label: "Disponível" },
          { color: "bg-primary", label: "Selecionado" },
          { color: "bg-surface-dim", label: "Indisponível" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2" role="listitem">
            <div className={`w-4 h-4 rounded-none ${item.color}`} aria-hidden="true" />
            <span className="text-xs font-body text-on-surface/50">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Selection summary */}
      {selected.size > 0 && (
        <div
          className="bg-surface-low rounded-sm p-4 flex items-center justify-between"
          role="status"
          aria-live="polite"
        >
          <div>
            <p className="text-xs font-body text-on-surface/50">
              {selected.size} assento{selected.size > 1 ? "s" : ""} selecionado
              {selected.size > 1 ? "s" : ""}
            </p>
            <p className="font-display font-bold text-on-surface tracking-tight">
              {sectionPrice
                ? formatCurrency(sectionPrice * selected.size)
                : "—"}
            </p>
          </div>
          <button
            onClick={() => {
              setSelected(new Set());
              onSelectionChange([]);
            }}
            className="text-xs font-body text-on-surface/40 hover:text-error underline underline-offset-2 transition-colors duration-150"
            aria-label="Limpar seleção de assentos"
          >
            Limpar
          </button>
        </div>
      )}
    </div>
  );
}

function SeatButton({
  seat,
  isSelected,
  onToggle,
}: {
  seat: Seat;
  isSelected: boolean;
  onToggle: (seat: Seat) => void;
}) {
  const isAvailable = seat.status === "AVAILABLE";
  const isReserved = seat.status === "RESERVED";

  const label = isAvailable
    ? `${seat.section}, fileira ${seat.row}, assento ${seat.number}, ${formatCurrency(seat.priceCents)}${isSelected ? ", selecionado" : ""}`
    : isReserved
    ? `${seat.section}, fileira ${seat.row}, assento ${seat.number} — reservado`
    : `${seat.section}, fileira ${seat.row}, assento ${seat.number} — indisponível`;

  return (
    <button
      role="button"
      onClick={() => onToggle(seat)}
      disabled={!isAvailable}
      aria-label={label}
      aria-pressed={isSelected}
      className={[
        "w-6 h-6 rounded-none transition-colors duration-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
        isSelected
          ? "bg-primary scale-110"
          : isAvailable
          ? "bg-surface-high border border-outline-variant hover:bg-primary/20 cursor-pointer"
          : isReserved
          ? "bg-surface-dim cursor-not-allowed opacity-60"
          : "bg-surface-dim cursor-not-allowed opacity-40",
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}
