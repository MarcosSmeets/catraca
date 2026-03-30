"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import Image from "next/image";
import { Seat, Venue, formatCurrency } from "@/lib/mock-data";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SectionInfo {
  name: string;
  availableCount: number;
  minPriceCents: number;
  totalSeats: number;
}

interface TooltipState {
  section: string;
  x: number;
  y: number;
}

interface StadiumMapProps {
  seats: Seat[];
  venue: Venue;
  onSelectionChange: (selected: Seat[]) => void;
  maxSelectable?: number;
}

// ─── Price tier helpers ─────────────────────────────────────────────────────────

function priceTier(cents: number): "budget" | "mid" | "premium" {
  if (cents < 7000) return "budget";
  if (cents < 15000) return "mid";
  return "premium";
}

const TIER_FILL: Record<string, string> = {
  budget: "#22c55e",
  mid: "#eab308",
  premium: "#f97316",
};
const TIER_FILL_HOVER: Record<string, string> = {
  budget: "#16a34a",
  mid: "#ca8a04",
  premium: "#ea580c",
};
const TIER_LABEL: Record<string, string> = {
  budget: "Melhor custo",
  mid: "Intermediário",
  premium: "Premium",
};

// ─── SVG layout — 5 sections around a central pitch ───────────────────────────
// ViewBox: 0 0 560 460
// Pitch: x=140 y=120 w=280 h=220
// Each section is a polygon around the pitch

const SVG_SECTIONS: Record<
  string,
  { path: string; labelX: number; labelY: number }
> = {
  Norte: {
    // Top arc above the pitch
    path: "M 60,20 L 500,20 L 500,118 L 140,118 L 140,80 L 420,80 L 420,118 L 500,118 L 500,20 Z",
    labelX: 280,
    labelY: 68,
  },
  Sul: {
    // Bottom arc below the pitch
    path: "M 60,440 L 500,440 L 500,342 L 420,342 L 420,380 L 140,380 L 140,342 L 60,342 Z",
    labelX: 280,
    labelY: 392,
  },
  "Leste Premium": {
    // Right side
    path: "M 422,118 L 500,118 L 500,342 L 422,342 L 422,380 L 540,380 L 540,80 L 422,80 Z",
    labelX: 492,
    labelY: 230,
  },
  "Oeste Premium": {
    // Left side
    path: "M 138,118 L 60,118 L 60,342 L 138,342 L 138,380 L 20,380 L 20,80 L 138,80 Z",
    labelX: 68,
    labelY: 230,
  },
  "Cadeiras Superiores": {
    // Outer ring — rendered as 4 thin strips
    path: "M 0,0 L 560,0 L 560,20 L 0,20 Z M 0,440 L 560,440 L 560,460 L 0,460 Z M 0,0 L 20,0 L 20,460 L 0,460 Z M 540,0 L 560,0 L 560,460 L 540,460 Z",
    labelX: 280,
    labelY: 10,
  },
};

// ─── StadiumMap ────────────────────────────────────────────────────────────────

export default function StadiumMap({
  seats,
  venue,
  onSelectionChange,
  maxSelectable = 6,
}: StadiumMapProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Build per-section summary
  const sectionInfo = useMemo<Record<string, SectionInfo>>(() => {
    const map: Record<string, SectionInfo> = {};
    seats.forEach((seat) => {
      if (!map[seat.section]) {
        map[seat.section] = {
          name: seat.section,
          availableCount: 0,
          minPriceCents: Infinity,
          totalSeats: 0,
        };
      }
      map[seat.section].totalSeats++;
      if (seat.status === "AVAILABLE") {
        map[seat.section].availableCount++;
        if (seat.priceCents < map[seat.section].minPriceCents) {
          map[seat.section].minPriceCents = seat.priceCents;
        }
      }
    });
    // Fallback price if all sold out
    Object.values(map).forEach((s) => {
      if (s.minPriceCents === Infinity) s.minPriceCents = 0;
    });
    return map;
  }, [seats]);

  // Average price for "amazing deal" badge
  const avgPrice = useMemo(() => {
    const prices = Object.values(sectionInfo)
      .filter((s) => s.minPriceCents > 0)
      .map((s) => s.minPriceCents);
    if (prices.length === 0) return 0;
    return prices.reduce((a, b) => a + b, 0) / prices.length;
  }, [sectionInfo]);

  const handleSectionClick = useCallback((sectionName: string) => {
    const info = sectionInfo[sectionName];
    if (!info || info.availableCount === 0) return;
    setActiveSection(sectionName);
    setTooltip(null);
  }, [sectionInfo]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGElement>, sectionName: string) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      setTooltip({
        section: sectionName,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    },
    []
  );

  if (activeSection && sectionInfo[activeSection]) {
    return (
      <SectionDetailView
        section={activeSection}
        info={sectionInfo[activeSection]}
        seats={seats.filter((s) => s.section === activeSection)}
        venue={venue}
        avgPrice={avgPrice}
        onBack={() => {
          setActiveSection(null);
          onSelectionChange([]);
        }}
        onSelectionChange={onSelectionChange}
        maxSelectable={maxSelectable}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {(["budget", "mid", "premium"] as const).map((tier) => (
          <div key={tier} className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ background: TIER_FILL[tier] }}
            />
            <span className="text-[11px] font-body text-on-surface/50">
              {TIER_LABEL[tier]}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="inline-block w-3 h-3 rounded-sm bg-surface-dim" />
          <span className="text-[11px] font-body text-on-surface/50">
            Esgotado
          </span>
        </div>
      </div>

      {/* SVG Map */}
      <div className="relative w-full select-none" style={{ aspectRatio: "560/460" }}>
        <svg
          ref={svgRef}
          viewBox="0 0 560 460"
          className="w-full h-full"
          aria-label="Mapa interativo do estádio. Clique em um setor para ver os assentos."
          role="img"
          onMouseLeave={() => setTooltip(null)}
        >
          {/* Background */}
          <rect width="560" height="460" fill="var(--color-surface-lowest, #f9f9f9)" rx="8" />

          {/* Sections */}
          {Object.entries(SVG_SECTIONS).map(([name, shape]) => {
            const info = sectionInfo[name];
            const available = info?.availableCount ?? 0;
            const price = info?.minPriceCents ?? 0;
            const tier = price > 0 ? priceTier(price) : "budget";
            const isSoldOut = available === 0;
            const fill = isSoldOut ? "#d1d5db" : TIER_FILL[tier];
            const hoverFill = isSoldOut ? "#d1d5db" : TIER_FILL_HOVER[tier];

            return (
              <g key={name}>
                <path
                  d={shape.path}
                  fill={fill}
                  stroke="var(--color-surface-lowest, #f9f9f9)"
                  strokeWidth="2"
                  className="transition-colors duration-150"
                  style={{ cursor: isSoldOut ? "not-allowed" : "pointer" }}
                  opacity={isSoldOut ? 0.45 : 1}
                  onClick={() => handleSectionClick(name)}
                  onMouseMove={(e) => handleMouseMove(e, name)}
                  onMouseEnter={(e) => {
                    if (!isSoldOut) {
                      (e.currentTarget as SVGPathElement).style.fill = hoverFill;
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as SVGPathElement).style.fill = fill;
                  }}
                  aria-label={`Setor ${name}${isSoldOut ? " — esgotado" : `, a partir de ${formatCurrency(price)}, ${available} disponíveis`}`}
                  role="button"
                  tabIndex={isSoldOut ? -1 : 0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") handleSectionClick(name);
                  }}
                />
                {/* Price badge — skip for "Cadeiras Superiores" outer strips */}
                {name !== "Cadeiras Superiores" && (
                  <>
                    <rect
                      x={shape.labelX - 26}
                      y={shape.labelY - 11}
                      width={52}
                      height={22}
                      rx={11}
                      fill="rgba(0,0,0,0.55)"
                      className="pointer-events-none"
                    />
                    <text
                      x={shape.labelX}
                      y={shape.labelY + 4}
                      textAnchor="middle"
                      fill="white"
                      fontSize="9"
                      fontWeight="700"
                      fontFamily="inherit"
                      className="pointer-events-none"
                    >
                      {isSoldOut ? "Esgotado" : formatCurrency(price)}
                    </text>
                  </>
                )}
                {/* Availability pulse dot */}
                {!isSoldOut && name !== "Cadeiras Superiores" && (
                  <circle
                    cx={shape.labelX + 30}
                    cy={shape.labelY}
                    r={4}
                    fill="#4ade80"
                    className="pointer-events-none"
                    opacity={0.9}
                  />
                )}
              </g>
            );
          })}

          {/* Pitch */}
          <rect x="140" y="120" width="280" height="220" fill="#166534" rx="4" />
          {/* Pitch markings */}
          <rect x="140" y="120" width="280" height="220" fill="none" stroke="#15803d" strokeWidth="1.5" rx="4" />
          {/* Center circle */}
          <circle cx="280" cy="230" r="35" fill="none" stroke="#15803d" strokeWidth="1.5" />
          {/* Center spot */}
          <circle cx="280" cy="230" r="3" fill="#15803d" />
          {/* Halfway line */}
          <line x1="140" y1="230" x2="420" y2="230" stroke="#15803d" strokeWidth="1.5" />
          {/* Penalty areas */}
          <rect x="195" y="120" width="170" height="45" fill="none" stroke="#15803d" strokeWidth="1.5" />
          <rect x="195" y="295" width="170" height="45" fill="none" stroke="#15803d" strokeWidth="1.5" />
          {/* Goal areas */}
          <rect x="235" y="120" width="90" height="20" fill="none" stroke="#15803d" strokeWidth="1.5" />
          <rect x="235" y="300" width="90" height="20" fill="none" stroke="#15803d" strokeWidth="1.5" />

          {/* Field label */}
          <text
            x="280"
            y="236"
            textAnchor="middle"
            fill="rgba(255,255,255,0.3)"
            fontSize="9"
            fontWeight="600"
            letterSpacing="2"
            fontFamily="inherit"
          >
            CAMPO
          </text>
        </svg>

        {/* Hover Tooltip */}
        {tooltip && sectionInfo[tooltip.section] && (
          <SectionTooltip
            info={sectionInfo[tooltip.section]}
            x={tooltip.x}
            y={tooltip.y}
          />
        )}
      </div>

      <p className="text-[11px] font-body text-on-surface/30 text-center">
        Clique em um setor para ver os assentos disponíveis
      </p>
    </div>
  );
}

// ─── Tooltip ───────────────────────────────────────────────────────────────────

function SectionTooltip({
  info,
  x,
  y,
}: {
  info: SectionInfo;
  x: number;
  y: number;
}) {
  const isSoldOut = info.availableCount === 0;
  const tier = info.minPriceCents > 0 ? priceTier(info.minPriceCents) : "budget";

  return (
    <div
      className="pointer-events-none absolute z-20 w-44 bg-surface-lowest border border-outline-variant rounded-md shadow-lg p-3"
      style={{ left: Math.min(x + 12, 999), top: Math.max(y - 60, 4) }}
    >
      <p className="font-display font-bold text-sm text-on-surface tracking-tight mb-1">
        {info.name}
      </p>
      {isSoldOut ? (
        <p className="text-xs font-body text-error">Esgotado</p>
      ) : (
        <>
          <p className="text-xs font-body text-on-surface/60 mb-1">
            A partir de{" "}
            <span className="font-semibold text-on-surface">
              {formatCurrency(info.minPriceCents)}
            </span>
          </p>
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: TIER_FILL[tier] }}
            />
            <span className="text-[10px] font-body text-on-surface/50">
              {info.availableCount} disponíveis
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Section Detail View ───────────────────────────────────────────────────────

function SectionDetailView({
  section,
  info,
  seats,
  venue,
  avgPrice,
  onBack,
  onSelectionChange,
  maxSelectable,
}: {
  section: string;
  info: SectionInfo;
  seats: Seat[];
  venue: Venue;
  avgPrice: number;
  onBack: () => void;
  onSelectionChange: (selected: Seat[]) => void;
  maxSelectable: number;
}) {
  const photoUrl =
    venue.sectionPhotos?.[section] ??
    venue.imageUrl ??
    "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=600&q=80";

  const isAmazingDeal = avgPrice > 0 && info.minPriceCents < avgPrice * 0.85;
  const tier = priceTier(info.minPriceCents);

  return (
    <div className="flex flex-col gap-5">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-xs font-body text-on-surface/50 hover:text-on-surface transition-colors duration-150 w-fit"
        aria-label="Voltar ao mapa do estádio"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Todos os setores
      </button>

      {/* Section photo card */}
      <div className="bg-surface-lowest rounded-md overflow-hidden border border-outline-variant">
        {/* Photo */}
        <div className="relative h-44">
          <Image
            src={photoUrl}
            alt={`Vista do setor ${section}`}
            fill
            className="object-cover"
            sizes="700px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

          {/* Badges */}
          <div className="absolute top-3 left-3 flex gap-2">
            <span
              className="px-2.5 py-1 rounded-full text-[10px] font-body font-semibold text-white"
              style={{ background: TIER_FILL[tier] }}
            >
              {TIER_LABEL[tier]}
            </span>
            {isAmazingDeal && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-body font-semibold bg-primary text-on-primary">
                Ótimo negócio
              </span>
            )}
          </div>

          {/* Section name + price overlay */}
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
            <div>
              <p className="font-display font-black text-white text-lg tracking-tight leading-none uppercase drop-shadow">
                {section}
              </p>
              <p className="text-white/70 text-xs font-body mt-0.5">
                Vista do setor
              </p>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-[10px] font-body">A partir de</p>
              <p className="font-display font-black text-white text-xl tracking-tight">
                {formatCurrency(info.minPriceCents)}
              </p>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center divide-x divide-outline-variant">
          <div className="flex-1 px-4 py-3 text-center">
            <p className="text-[10px] font-body text-on-surface/40 uppercase tracking-wider mb-0.5">
              Disponíveis
            </p>
            <p className="font-display font-bold text-sm text-on-surface">
              {info.availableCount}
            </p>
          </div>
          <div className="flex-1 px-4 py-3 text-center">
            <p className="text-[10px] font-body text-on-surface/40 uppercase tracking-wider mb-0.5">
              Total
            </p>
            <p className="font-display font-bold text-sm text-on-surface">
              {info.totalSeats}
            </p>
          </div>
          <div className="flex-1 px-4 py-3 text-center">
            <p className="text-[10px] font-body text-on-surface/40 uppercase tracking-wider mb-0.5">
              Máx. por pedido
            </p>
            <p className="font-display font-bold text-sm text-on-surface">
              {maxSelectable}
            </p>
          </div>
        </div>
      </div>

      {/* Seat grid */}
      <SeatGrid
        seats={seats}
        onSelectionChange={onSelectionChange}
        maxSelectable={maxSelectable}
      />
    </div>
  );
}

// ─── SeatGrid (inline seat selection) ─────────────────────────────────────────

function SeatGrid({
  seats,
  onSelectionChange,
  maxSelectable,
}: {
  seats: Seat[];
  onSelectionChange: (selected: Seat[]) => void;
  maxSelectable: number;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Build rows
  const seatRows = useMemo<Seat[][]>(() => {
    const rows: Seat[][] = [];
    seats.forEach((seat) => {
      if (!rows[seat.rowIndex]) rows[seat.rowIndex] = [];
      rows[seat.rowIndex][seat.col] = seat;
    });
    return rows;
  }, [seats]);

  const availableCount = seats.filter((s) => s.status === "AVAILABLE").length;

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
        onSelectionChange(seats.filter((s) => next.has(s.id)));
        return next;
      });
    },
    [seats, maxSelectable, onSelectionChange]
  );

  const minPrice = seats.find((s) => s.status === "AVAILABLE")?.priceCents;

  return (
    <div className="flex flex-col gap-4">
      {/* Stage indicator */}
      <div className="flex flex-col items-center gap-1" aria-hidden="true">
        <div className="w-full max-w-xs h-1.5 bg-primary/20 rounded-none" />
        <span className="text-[10px] font-body uppercase tracking-widest text-on-surface/30">
          Campo / Palco
        </span>
      </div>

      {/* Grid */}
      <div
        className="overflow-x-auto"
        role="grid"
        aria-label={`Grade de assentos. ${availableCount} disponíveis. Máximo ${maxSelectable} por pedido.`}
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
                  <div
                    key={cIdx}
                    className="w-6 h-6"
                    role="gridcell"
                    aria-hidden="true"
                  />
                )
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4" role="list" aria-label="Legenda">
        {[
          {
            color: "bg-surface-high border border-outline-variant",
            label: "Disponível",
          },
          { color: "bg-primary", label: "Selecionado" },
          { color: "bg-surface-dim", label: "Indisponível" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2" role="listitem">
            <div
              className={`w-4 h-4 rounded-none ${item.color}`}
              aria-hidden="true"
            />
            <span className="text-xs font-body text-on-surface/50">
              {item.label}
            </span>
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
              {minPrice ? formatCurrency(minPrice * selected.size) : "—"}
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

// ─── SeatButton ────────────────────────────────────────────────────────────────

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
    ? `Fileira ${seat.row}, assento ${seat.number}, ${formatCurrency(seat.priceCents)}${isSelected ? ", selecionado" : ""}`
    : `Fileira ${seat.row}, assento ${seat.number} — ${isReserved ? "reservado" : "indisponível"}`;

  return (
    <button
      role="gridcell"
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
