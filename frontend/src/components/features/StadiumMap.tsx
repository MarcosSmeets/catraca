"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Image from "next/image";
import { Seat, Venue, formatCurrency } from "@/lib/mock-data";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SectionInfo {
  name: string;
  availableCount: number;
  minPriceCents: number;
  totalSeats: number;
}

interface HoverCardState {
  section: string;
  clientX: number;
  clientY: number;
}

interface StadiumMapProps {
  seats: Seat[];
  venue: Venue;
  onSelectionChange: (selected: Seat[]) => void;
  maxSelectable?: number;
  sport?: string;
}

// ─── Price tier helpers ─────────────────────────────────────────────────────────

function priceTier(cents: number, sport?: string): "budget" | "mid" | "premium" {
  if (sport === "BASKETBALL") {
    if (cents < 15000) return "budget";
    if (cents < 65000) return "mid";
    return "premium";
  }
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

// ─── SVG layout — dynamic stadium sections ─────────────────────────────────────
// ViewBox: 0 0 560 480
// Pitch: x=128..432, y=132..348 (the inner rectangle).
// Sections are arranged around this inner rectangle as outer strips. The set of
// "slot" shapes is precomputed; the layout function picks which slots to use
// given the number of sections that actually have seats.

type SectionShape = {
  path: string;
  labelX: number;
  labelY: number;
  labelRotate?: number;
  labelFontSize?: number;
  fillRule?: "evenodd" | "nonzero";
};

const SLOT_SHAPES: Record<string, SectionShape> = {
  // Full sides (used for 2–4 sections)
  N: { path: "M 28,28 L 532,28 L 532,132 L 28,132 Z", labelX: 280, labelY: 80 },
  S: { path: "M 28,348 L 532,348 L 532,452 L 28,452 Z", labelX: 280, labelY: 400 },
  E: { path: "M 432,132 L 532,132 L 532,348 L 432,348 Z", labelX: 482, labelY: 240, labelRotate: 90 },
  W: { path: "M 28,132 L 128,132 L 128,348 L 28,348 Z", labelX: 78, labelY: 240, labelRotate: -90 },
  // Half sides (used for 5–8 sections)
  "N-L": { path: "M 28,28 L 280,28 L 280,132 L 28,132 Z", labelX: 154, labelY: 80, labelFontSize: 8.5 },
  "N-R": { path: "M 280,28 L 532,28 L 532,132 L 280,132 Z", labelX: 406, labelY: 80, labelFontSize: 8.5 },
  "S-L": { path: "M 28,348 L 280,348 L 280,452 L 28,452 Z", labelX: 154, labelY: 400, labelFontSize: 8.5 },
  "S-R": { path: "M 280,348 L 532,348 L 532,452 L 280,452 Z", labelX: 406, labelY: 400, labelFontSize: 8.5 },
  "E-T": { path: "M 432,132 L 532,132 L 532,240 L 432,240 Z", labelX: 482, labelY: 186, labelRotate: 90, labelFontSize: 8 },
  "E-B": { path: "M 432,240 L 532,240 L 532,348 L 432,348 Z", labelX: 482, labelY: 294, labelRotate: 90, labelFontSize: 8 },
  "W-T": { path: "M 28,132 L 128,132 L 128,240 L 28,240 Z", labelX: 78, labelY: 186, labelRotate: -90, labelFontSize: 8 },
  "W-B": { path: "M 28,240 L 128,240 L 128,348 L 28,348 Z", labelX: 78, labelY: 294, labelRotate: -90, labelFontSize: 8 },
  // Full ring — single-section fallback (outer rect minus pitch rect, evenodd)
  RING: {
    path: "M 0,0 L 560,0 L 560,480 L 0,480 Z M 128,132 L 432,132 L 432,348 L 128,348 Z",
    labelX: 280,
    labelY: 24,
    fillRule: "evenodd",
  },
};

function slotsForCount(n: number): string[] {
  if (n <= 0) return [];
  if (n === 1) return ["RING"];
  if (n === 2) return ["N", "S"];
  if (n === 3) return ["N", "S", "E"];
  if (n === 4) return ["N", "S", "E", "W"];
  if (n === 5) return ["N-L", "N-R", "S", "E", "W"];
  if (n === 6) return ["N-L", "N-R", "S-L", "S-R", "E", "W"];
  if (n === 7) return ["N-L", "N-R", "S-L", "S-R", "E-T", "E-B", "W"];
  return ["N-L", "N-R", "S-L", "S-R", "E-T", "E-B", "W-T", "W-B"]; // 8+ (extras merged)
}

function buildSectionShapes(sectionNames: string[]): Record<string, SectionShape> {
  // For counts > 8 we fold the tail into the last slot (simple fallback).
  const capped = sectionNames.slice(0, 8);
  const overflow = sectionNames.slice(8);
  const slots = slotsForCount(capped.length);
  const map: Record<string, SectionShape> = {};
  capped.forEach((name, i) => {
    const shape = SLOT_SHAPES[slots[i]];
    if (shape) map[name] = shape;
  });
  // Attach overflow names to the last shape so at least they render as one block
  if (overflow.length && capped.length) {
    const lastShape = SLOT_SHAPES[slots[capped.length - 1]];
    overflow.forEach((name) => {
      if (lastShape) map[name] = lastShape;
    });
  }
  return map;
}

// ─── StadiumMap ────────────────────────────────────────────────────────────────

export default function StadiumMap({
  seats,
  venue,
  onSelectionChange,
  maxSelectable = 6,
  sport,
}: StadiumMapProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [hoverCard, setHoverCard] = useState<HoverCardState | null>(null);
  // On touch devices, tapping a section shows a preview card before drilling in
  const [tapPreview, setTapPreview] = useState<string | null>(null);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch(window.matchMedia("(hover: none)").matches);
  }, []);

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
    Object.values(map).forEach((s) => {
      if (s.minPriceCents === Infinity) s.minPriceCents = 0;
    });
    return map;
  }, [seats]);

  const avgPrice = useMemo(() => {
    const prices = Object.values(sectionInfo)
      .filter((s) => s.minPriceCents > 0)
      .map((s) => s.minPriceCents);
    if (prices.length === 0) return 0;
    return prices.reduce((a, b) => a + b, 0) / prices.length;
  }, [sectionInfo]);

  // Build dynamic layout from the sections present in the seats data.
  // Sort by section name so placement is stable across renders.
  const sectionShapes = useMemo(() => {
    const names = Object.keys(sectionInfo).sort((a, b) => a.localeCompare(b, "pt-BR"));
    return buildSectionShapes(names);
  }, [sectionInfo]);

  const handleSectionClick = useCallback(
    (sectionName: string) => {
      const info = sectionInfo[sectionName];
      if (!info || info.availableCount === 0) return;
      if (isTouch) {
        // On touch: first tap shows preview card, second tap drills in
        if (tapPreview === sectionName) {
          setTapPreview(null);
          setActiveSection(sectionName);
        } else {
          setTapPreview(sectionName);
        }
        setHoverCard(null);
      } else {
        setActiveSection(sectionName);
        setHoverCard(null);
      }
    },
    [sectionInfo, isTouch, tapPreview]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGPathElement>, sectionName: string) => {
      setHoverCard({ section: sectionName, clientX: e.clientX, clientY: e.clientY });
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
        sport={sport}
        onBack={() => {
          setActiveSection(null);
          setTapPreview(null);
          onSelectionChange([]);
        }}
        onSelectionChange={onSelectionChange}
        maxSelectable={maxSelectable}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
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

      {/* 3D perspective wrapper */}
      <div
        style={{ perspective: "700px", perspectiveOrigin: "50% 40%" }}
        className="w-full select-none"
      >
        <div
          style={{
            transform: "rotateX(22deg)",
            transformOrigin: "center 55%",
          }}
        >
          <svg
            viewBox="0 0 560 480"
            className="w-full h-auto"
            aria-label="Mapa interativo do estádio. Clique em um setor para ver os assentos."
            role="img"
            onMouseLeave={!isTouch ? () => setHoverCard(null) : undefined}
          >
            {/* Background */}
            <rect width="560" height="480" fill="var(--color-surface-lowest, #f9f9f9)" rx="6" />

            {/* Sections */}
            {Object.entries(sectionShapes).map(([name, shape]) => {
              const info = sectionInfo[name];
              const available = info?.availableCount ?? 0;
              const price = info?.minPriceCents ?? 0;
              const tier = price > 0 ? priceTier(price, sport) : "budget";
              const isSoldOut = available === 0;
              const fill = isSoldOut ? "#d1d5db" : TIER_FILL[tier];
              const hoverFill = isSoldOut ? "#d1d5db" : TIER_FILL_HOVER[tier];
              const isHovered = hoverCard?.section === name;
              const labelFontSize = shape.labelFontSize ?? 10;
              const displayName = name.length > 18 ? `${name.slice(0, 17)}…` : name;

              return (
                <g key={name}>
                  <path
                    d={shape.path}
                    fillRule={shape.fillRule ?? "nonzero"}
                    fill={isHovered && !isSoldOut ? hoverFill : fill}
                    stroke="var(--color-surface-lowest, #f9f9f9)"
                    strokeWidth="2"
                    style={{ cursor: isSoldOut ? "not-allowed" : "pointer" }}
                    opacity={isSoldOut ? 0.45 : 1}
                    onClick={() => handleSectionClick(name)}
                    onMouseMove={!isTouch ? (e) => handleMouseMove(e, name) : undefined}
                    onMouseLeave={!isTouch ? () => setHoverCard(null) : undefined}
                    aria-label={`Setor ${name}${isSoldOut ? " — esgotado" : `, a partir de ${formatCurrency(price)}, ${available} disponíveis`}`}
                    role="button"
                    tabIndex={isSoldOut ? -1 : 0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") handleSectionClick(name);
                    }}
                  />
                  {/* Section name label */}
                  <text
                    x={shape.labelX}
                    y={shape.labelY + 4}
                    textAnchor="middle"
                    fill="rgba(0,0,0,0.55)"
                    fontSize={labelFontSize}
                    fontWeight="700"
                    fontFamily="inherit"
                    letterSpacing="0.5"
                    className="pointer-events-none uppercase"
                    transform={
                      shape.labelRotate
                        ? `rotate(${shape.labelRotate}, ${shape.labelX}, ${shape.labelY})`
                        : undefined
                    }
                  >
                    {displayName}
                  </text>
                  {/* Price badge */}
                  {!isSoldOut && (
                    <>
                      <rect
                        x={shape.labelX - 28}
                        y={shape.labelY - 22}
                        width={56}
                        height={20}
                        rx={10}
                        fill="rgba(0,0,0,0.6)"
                        className="pointer-events-none"
                        transform={
                          shape.labelRotate
                            ? `rotate(${shape.labelRotate}, ${shape.labelX}, ${shape.labelY})`
                            : undefined
                        }
                      />
                      <text
                        x={shape.labelX}
                        y={shape.labelY - 8}
                        textAnchor="middle"
                        fill="white"
                        fontSize="8.5"
                        fontWeight="700"
                        fontFamily="inherit"
                        className="pointer-events-none"
                        transform={
                          shape.labelRotate
                            ? `rotate(${shape.labelRotate}, ${shape.labelX}, ${shape.labelY})`
                            : undefined
                        }
                      >
                        {formatCurrency(price)}
                      </text>
                    </>
                  )}
                  {/* Availability dot */}
                  {!isSoldOut && (
                    <circle
                      cx={shape.labelX + 32}
                      cy={shape.labelY - 12}
                      r={4}
                      fill="#4ade80"
                      className="pointer-events-none"
                      opacity={0.9}
                      transform={
                        shape.labelRotate
                          ? `rotate(${shape.labelRotate}, ${shape.labelX}, ${shape.labelY})`
                          : undefined
                      }
                    />
                  )}
                </g>
              );
            })}

            {/* Playing surface — basketball court or football pitch */}
            {sport === "BASKETBALL" ? (
              <BasketballCourtSVG />
            ) : (
              <FootballPitchSVG />
            )}
          </svg>
        </div>
      </div>

      {/* Hover card — rendered OUTSIDE the 3D transform so position:fixed works correctly */}
      {!isTouch && hoverCard && sectionInfo[hoverCard.section] && (
        <SectionHoverCard
          info={sectionInfo[hoverCard.section]}
          venue={venue}
          clientX={hoverCard.clientX}
          clientY={hoverCard.clientY}
        />
      )}

      {/* Tap preview — shown on touch devices after first tap on a section */}
      {isTouch && tapPreview && sectionInfo[tapPreview] && (
        <TapPreviewCard
          info={sectionInfo[tapPreview]}
          venue={venue}
          onConfirm={() => {
            setTapPreview(null);
            setActiveSection(tapPreview);
          }}
          onDismiss={() => setTapPreview(null)}
        />
      )}

      <p className="text-[11px] font-body text-on-surface/30 text-center">
        {isTouch
          ? "Toque em um setor para ver os assentos disponíveis"
          : "Clique em um setor para ver os assentos disponíveis"}
      </p>
    </div>
  );
}

// ─── Football Pitch SVG ────────────────────────────────────────────────────────

function FootballPitchSVG() {
  return (
    <>
      <rect x="128" y="132" width="304" height="216" fill="#166534" rx="3" />
      <rect x="128" y="132" width="304" height="216" fill="none" stroke="#15803d" strokeWidth="1.5" rx="3" />
      <line x1="128" y1="240" x2="432" y2="240" stroke="#15803d" strokeWidth="1.5" />
      <circle cx="280" cy="240" r="34" fill="none" stroke="#15803d" strokeWidth="1.5" />
      <circle cx="280" cy="240" r="3" fill="#15803d" />
      <rect x="182" y="132" width="196" height="46" fill="none" stroke="#15803d" strokeWidth="1.5" />
      <rect x="182" y="302" width="196" height="46" fill="none" stroke="#15803d" strokeWidth="1.5" />
      <rect x="230" y="132" width="100" height="20" fill="none" stroke="#15803d" strokeWidth="1.5" />
      <rect x="230" y="328" width="100" height="20" fill="none" stroke="#15803d" strokeWidth="1.5" />
      <text x="280" y="244" textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="9" fontWeight="700" letterSpacing="3" fontFamily="inherit">
        CAMPO
      </text>
    </>
  );
}

// ─── Basketball Court SVG ──────────────────────────────────────────────────────
// Court occupies x=128..432, y=132..348 (304×216px) — same area as the football pitch.
// Layout (horizontal court, baskets on left and right):
//   Center: (280, 240), half-court line at x=280
//   Left basket at x=146, y=240; right basket at x=414, y=240
//   Paint (key): 74px wide × 80px tall, centred on y=240
//   Three-point arc: r≈80, corner lines at y=164 and y=316

function BasketballCourtSVG() {
  const lnStroke = "#8b5218";
  const lnW = 1.5;
  const court = "#c8733a";

  return (
    <>
      {/* Court floor */}
      <rect x="128" y="132" width="304" height="216" fill={court} rx="3" />

      {/* Half-court line */}
      <line x1="280" y1="132" x2="280" y2="348" stroke={lnStroke} strokeWidth={lnW} />

      {/* Center circle */}
      <circle cx="280" cy="240" r="26" fill="none" stroke={lnStroke} strokeWidth={lnW} />
      <circle cx="280" cy="240" r="3" fill={lnStroke} />

      {/* ── Left side ── */}
      {/* Paint / key */}
      <rect x="128" y="200" width="74" height="80" fill="rgba(0,0,0,0.08)" stroke={lnStroke} strokeWidth={lnW} />
      {/* Free-throw lane (dashed arc) */}
      <path d="M 202 200 A 40 40 0 0 1 202 280" fill="none" stroke={lnStroke} strokeWidth={lnW} strokeDasharray="4 3" />
      {/* Corner three-point lines */}
      <line x1="128" y1="164" x2="170" y2="164" stroke={lnStroke} strokeWidth={lnW} />
      <line x1="128" y1="316" x2="170" y2="316" stroke={lnStroke} strokeWidth={lnW} />
      {/* Three-point arc (center≈(146,240), r≈80) */}
      <path d="M 170 164 A 82 82 0 0 1 170 316" fill="none" stroke={lnStroke} strokeWidth={lnW} />
      {/* Backboard */}
      <rect x="128" y="227" width="4" height="26" fill={lnStroke} />
      {/* Hoop */}
      <circle cx="142" cy="240" r="7" fill="none" stroke="#e87722" strokeWidth="2.5" />

      {/* ── Right side (mirrored) ── */}
      <rect x="358" y="200" width="74" height="80" fill="rgba(0,0,0,0.08)" stroke={lnStroke} strokeWidth={lnW} />
      <path d="M 358 200 A 40 40 0 0 0 358 280" fill="none" stroke={lnStroke} strokeWidth={lnW} strokeDasharray="4 3" />
      <line x1="432" y1="164" x2="390" y2="164" stroke={lnStroke} strokeWidth={lnW} />
      <line x1="432" y1="316" x2="390" y2="316" stroke={lnStroke} strokeWidth={lnW} />
      <path d="M 390 164 A 82 82 0 0 0 390 316" fill="none" stroke={lnStroke} strokeWidth={lnW} />
      <rect x="428" y="227" width="4" height="26" fill={lnStroke} />
      <circle cx="418" cy="240" r="7" fill="none" stroke="#e87722" strokeWidth="2.5" />

      {/* Court label */}
      <text x="280" y="244" textAnchor="middle" fill="rgba(0,0,0,0.18)" fontSize="9" fontWeight="700" letterSpacing="3" fontFamily="inherit">
        QUADRA
      </text>
    </>
  );
}

// ─── Section Hover Card ────────────────────────────────────────────────────────

function SectionHoverCard({
  info,
  venue,
  clientX,
  clientY,
}: {
  info: SectionInfo;
  venue: Venue;
  clientX: number;
  clientY: number;
}) {
  const isSoldOut = info.availableCount === 0;
  const tier = info.minPriceCents > 0 ? priceTier(info.minPriceCents) : "budget";
  const photoUrl =
    (venue as { sectionPhotos?: Record<string, string>; imageUrl?: string }).sectionPhotos?.[info.name] ??
    (venue as { imageUrl?: string }).imageUrl ??
    "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=400&q=80";

  // Clamp to viewport edges
  const cardW = 200;
  const cardH = 210;
  const margin = 12;
  const left = Math.min(
    Math.max(clientX + 14, margin),
    (typeof window !== "undefined" ? window.innerWidth : 1200) - cardW - margin
  );
  const top = Math.min(
    Math.max(clientY - 90, margin),
    (typeof window !== "undefined" ? window.innerHeight : 800) - cardH - margin
  );

  return (
    <div
      className="pointer-events-none z-50 w-48 rounded-md overflow-hidden bg-surface-lowest border border-outline-variant shadow-xl"
      style={{ position: "fixed", left, top }}
    >
      {/* Photo */}
      <div className="relative h-24">
        <Image
          src={photoUrl}
          alt={`Vista — ${info.name}`}
          fill
          className="object-cover"
          sizes="200px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        {/* Tier badge */}
        <span
          className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-body font-bold text-white"
          style={{ background: TIER_FILL[tier] }}
        >
          {TIER_LABEL[tier]}
        </span>
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-1.5">
        <p className="font-display font-black text-sm text-on-surface tracking-tight uppercase leading-none">
          {info.name}
        </p>

        {isSoldOut ? (
          <p className="text-[11px] font-body text-error font-semibold">Esgotado</p>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#4ade80] shrink-0" />
              <span className="text-[11px] font-body text-on-surface/60">
                {info.availableCount} disponíveis
              </span>
            </div>
            <p className="text-[11px] font-body text-on-surface/50">
              A partir de{" "}
              <span className="font-bold text-on-surface">
                {formatCurrency(info.minPriceCents)}
              </span>
            </p>
            <p className="text-[10px] font-body text-accent font-semibold mt-0.5">
              Clique para ver assentos →
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Tap Preview Card (touch-device alternative to hover card) ─────────────────

function TapPreviewCard({
  info,
  venue,
  onConfirm,
  onDismiss,
}: {
  info: SectionInfo;
  venue: Venue;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  const isSoldOut = info.availableCount === 0;
  const tier = info.minPriceCents > 0 ? priceTier(info.minPriceCents) : "budget";
  const photoUrl =
    (venue as { sectionPhotos?: Record<string, string>; imageUrl?: string }).sectionPhotos?.[info.name] ??
    (venue as { imageUrl?: string }).imageUrl ??
    "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=400&q=80";

  return (
    <div className="rounded-md overflow-hidden bg-surface-lowest border border-outline-variant shadow-xl">
      {/* Photo */}
      <div className="relative h-28">
        <Image
          src={photoUrl}
          alt={`Vista — ${info.name}`}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, 400px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <span
          className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-body font-bold text-white"
          style={{ background: TIER_FILL[tier] }}
        >
          {TIER_LABEL[tier]}
        </span>
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/40 text-white flex items-center justify-center"
          aria-label="Fechar"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="p-3 flex flex-col gap-2">
        <p className="font-display font-black text-sm text-on-surface tracking-tight uppercase leading-none">
          {info.name}
        </p>

        {isSoldOut ? (
          <p className="text-[11px] font-body text-error font-semibold">Esgotado</p>
        ) : (
          <>
            <div className="flex items-center justify-between text-xs font-body text-on-surface/60">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#4ade80]" />
                {info.availableCount} disponíveis
              </span>
              <span className="font-bold text-on-surface">
                a partir de {formatCurrency(info.minPriceCents)}
              </span>
            </div>
            <button
              onClick={onConfirm}
              className="w-full py-2.5 bg-accent text-on-accent text-xs font-display font-bold uppercase tracking-tight rounded-sm"
            >
              Ver assentos →
            </button>
          </>
        )}
      </div>
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
  sport,
  onBack,
  onSelectionChange,
  maxSelectable,
}: {
  section: string;
  info: SectionInfo;
  seats: Seat[];
  venue: Venue;
  avgPrice: number;
  sport?: string;
  onBack: () => void;
  onSelectionChange: (selected: Seat[]) => void;
  maxSelectable: number;
}) {
  const photoUrl =
    (venue as { sectionPhotos?: Record<string, string>; imageUrl?: string }).sectionPhotos?.[section] ??
    (venue as { imageUrl?: string }).imageUrl ??
    "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=600&q=80";

  const isAmazingDeal = avgPrice > 0 && info.minPriceCents < avgPrice * 0.85;
  const tier = priceTier(info.minPriceCents, sport);

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

      {/* Split layout: photo card left, seat grid right (desktop) */}
      <div className="flex flex-col lg:flex-row lg:items-start gap-5">

        {/* ── Photo + info card (sticky on desktop) ── */}
        <div className="lg:w-64 shrink-0 lg:sticky lg:top-24 flex flex-col gap-0 bg-surface-lowest rounded-md overflow-hidden border border-outline-variant">
          {/* Photo */}
          <div className="relative h-44 lg:h-52">
            <Image
              src={photoUrl}
              alt={`Vista do setor ${section}`}
              fill
              className="object-cover"
              sizes="300px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

            {/* Badges */}
            <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
              <span
                className="px-2.5 py-1 rounded-full text-[10px] font-body font-semibold text-white"
                style={{ background: TIER_FILL[tier] }}
              >
                {TIER_LABEL[tier]}
              </span>
              {isAmazingDeal && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-body font-semibold bg-accent text-on-accent">
                  Ótimo negócio
                </span>
              )}
            </div>

            {/* Section name + price overlay */}
            <div className="absolute bottom-3 left-3 right-3">
              <p className="font-display font-black text-white text-lg tracking-tight leading-none uppercase drop-shadow">
                {section}
              </p>
              <p className="text-white/60 text-xs font-body mt-0.5 mb-2">
                Vista do setor
              </p>
              <div className="flex items-end justify-between">
                <span className="text-white/60 text-[10px] font-body">A partir de</span>
                <span className="font-display font-black text-white text-xl tracking-tight">
                  {formatCurrency(info.minPriceCents)}
                </span>
              </div>
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex items-center divide-x divide-outline-variant">
            <div className="flex-1 px-3 py-3 text-center">
              <p className="text-[10px] font-body text-on-surface/40 uppercase tracking-wider mb-0.5">
                Dispon.
              </p>
              <p className="font-display font-bold text-sm text-on-surface">
                {info.availableCount}
              </p>
            </div>
            <div className="flex-1 px-3 py-3 text-center">
              <p className="text-[10px] font-body text-on-surface/40 uppercase tracking-wider mb-0.5">
                Total
              </p>
              <p className="font-display font-bold text-sm text-on-surface">
                {info.totalSeats}
              </p>
            </div>
            <div className="flex-1 px-3 py-3 text-center">
              <p className="text-[10px] font-body text-on-surface/40 uppercase tracking-wider mb-0.5">
                Máx.
              </p>
              <p className="font-display font-bold text-sm text-on-surface">
                {maxSelectable}
              </p>
            </div>
          </div>
        </div>

        {/* ── Seat grid (scrollable) ── */}
        <div className="flex-1 min-w-0">
          <SeatGrid
            seats={seats}
            onSelectionChange={onSelectionChange}
            maxSelectable={maxSelectable}
            sport={sport}
          />
        </div>
      </div>
    </div>
  );
}

// ─── SeatGrid (inline seat selection) ─────────────────────────────────────────

function SeatGrid({
  seats,
  onSelectionChange,
  maxSelectable,
  sport,
}: {
  seats: Seat[];
  onSelectionChange: (selected: Seat[]) => void;
  maxSelectable: number;
  sport?: string;
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
      {/* Court / Field indicator */}
      <div className="relative flex flex-col items-center gap-1.5" aria-hidden="true">
        <div className="w-full h-6 rounded-sm overflow-hidden" style={{
          background: sport === "BASKETBALL"
            ? "linear-gradient(to bottom, #c8733a 0%, #d4883e 60%, transparent 100%)"
            : "linear-gradient(to bottom, #166534 0%, #15803d 60%, transparent 100%)",
          opacity: 0.35,
        }} />
        <div className="absolute inset-0 flex items-center justify-center gap-2">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path d="M5 9L5 1M5 1L2 4M5 1L8 4" stroke={sport === "BASKETBALL" ? "#c8733a" : "#166534"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-[10px] font-body uppercase tracking-widest text-on-surface/50 font-semibold">
            {sport === "BASKETBALL" ? "Quadra" : "Campo / Palco"}
          </span>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path d="M5 9L5 1M5 1L2 4M5 1L8 4" stroke={sport === "BASKETBALL" ? "#c8733a" : "#166534"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* Grid */}
      <div
        className="overflow-x-auto pb-1"
        role="grid"
        aria-label={`Grade de assentos. ${availableCount} disponíveis. Máximo ${maxSelectable} por pedido.`}
      >
        <div className="flex flex-col gap-1 min-w-fit mx-auto w-fit">
          {seatRows.map((row, rIdx) => {
            const rowPrice = row.find((s) => s?.status === "AVAILABLE")?.priceCents;
            const hasAvailable = row.some((s) => s?.status === "AVAILABLE");
            return (
              <div
                key={rIdx}
                className="flex gap-1 items-center"
                role="row"
                style={{ marginLeft: rIdx % 2 === 1 ? "6px" : "0" }}
              >
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
                      className="w-4 h-4"
                      role="gridcell"
                      aria-hidden="true"
                    />
                  )
                )}
                {/* Price pill per row */}
                {hasAvailable && rowPrice && (
                  <span className="ml-2 text-[10px] font-body font-semibold text-on-surface/60 bg-surface-lowest border border-outline-variant rounded-full px-2 py-0.5 shrink-0 whitespace-nowrap">
                    {formatCurrency(rowPrice)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4" role="list" aria-label="Legenda">
        {[
          { color: "#22c55e", label: "Disponível" },
          { isPrimary: true, label: "Selecionado" },
          { color: "#9ca3af", label: "Indisponível" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2" role="listitem">
            <div
              className={`w-3.5 h-3.5 rounded-full shrink-0${item.isPrimary ? " bg-accent" : ""}`}
              style={item.color ? { background: item.color } : undefined}
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

// ─── SeatButton — dot circular estilo SeatGeek ─────────────────────────────────

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
    <div className="relative group" role="gridcell">
      <button
        onClick={() => onToggle(seat)}
        disabled={!isAvailable}
        aria-label={label}
        aria-pressed={isSelected}
        style={
          isSelected
            ? undefined
            : isAvailable
            ? { background: "#22c55e" }
            : { background: "#d1d5db", opacity: isReserved ? 0.6 : 0.4 }
        }
        className={[
          // Larger invisible tap area for touch accessibility
          "w-7 h-7 flex items-center justify-center",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1",
          "touch-manipulation",
          isAvailable ? "cursor-pointer active:scale-95" : "cursor-not-allowed",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {/* Visual dot */}
        <span
          style={
            isSelected
              ? undefined
              : isAvailable
              ? { background: "#22c55e" }
              : { background: "#d1d5db", opacity: isReserved ? 0.6 : 0.4 }
          }
          className={[
            "block w-4 h-4 rounded-full transition-all duration-100",
            isSelected ? "bg-accent scale-125 shadow-sm shadow-accent/40" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        />
      </button>
      {/* Per-seat price tooltip on hover */}
      {isAvailable && !isSelected && (
        <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-100">
          <div className="bg-surface-lowest border border-outline-variant rounded-full px-2 py-0.5 shadow-md whitespace-nowrap">
            <span className="text-[10px] font-body font-semibold text-on-surface">
              {formatCurrency(seat.priceCents)}
            </span>
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-outline-variant" />
        </div>
      )}
    </div>
  );
}
