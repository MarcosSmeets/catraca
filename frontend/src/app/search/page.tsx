"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import MainLayout from "@/components/features/MainLayout";
import EventCard from "@/components/features/EventCard";
import Pagination from "@/components/ui/Pagination";
import { EventCardSkeleton } from "@/components/ui/Skeleton";
import { mockEvents, SportType, formatCurrency } from "@/lib/mock-data";

type SortOption = "date" | "price-asc" | "price-desc";

const SPORTS: { value: SportType | ""; label: string }[] = [
  { value: "", label: "Todos os esportes" },
  { value: "FOOTBALL", label: "Futebol" },
  { value: "BASKETBALL", label: "Basquete" },
  { value: "VOLLEYBALL", label: "Vôlei" },
  { value: "FUTSAL", label: "Futsal" },
];

const LEAGUES = ["", "Série A", "Série B", "NBB", "Superliga"];
const CITIES = ["", "São Paulo", "Rio de Janeiro", "Belo Horizonte", "Curitiba", "Fortaleza"];

const PRICE_STEPS = [0, 2000, 5000, 10000, 20000, 50000];
const PAGE_SIZE = 6;

function SearchPageContent() {
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [selectedSport, setSelectedSport] = useState<SportType | "">((searchParams.get("sport") as SportType) ?? "");
  const [selectedLeague, setSelectedLeague] = useState(searchParams.get("league") ?? "");
  const [selectedCity, setSelectedCity] = useState(searchParams.get("city") ?? "");
  const [sort, setSort] = useState<SortOption>("date");
  const [page, setPage] = useState(1);

  // Date filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Price range
  const [minPrice, setMinPrice] = useState(PRICE_STEPS[0]);
  const [maxPrice, setMaxPrice] = useState(PRICE_STEPS[PRICE_STEPS.length - 1]);

  const filtered = useMemo(() => {
    let events = [...mockEvents];

    if (query) {
      const q = query.toLowerCase();
      events = events.filter(
        (e) =>
          e.homeTeam.toLowerCase().includes(q) ||
          e.awayTeam.toLowerCase().includes(q) ||
          e.venue.city.toLowerCase().includes(q) ||
          e.league.toLowerCase().includes(q)
      );
    }
    if (selectedSport) events = events.filter((e) => e.sport === selectedSport);
    if (selectedLeague) events = events.filter((e) => e.league === selectedLeague);
    if (selectedCity) events = events.filter((e) => e.venue.city === selectedCity);

    if (dateFrom) {
      events = events.filter((e) => new Date(e.startsAt) >= new Date(dateFrom));
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      events = events.filter((e) => new Date(e.startsAt) <= toDate);
    }

    events = events.filter(
      (e) => e.minPriceCents >= minPrice && e.minPriceCents <= maxPrice
    );

    events.sort((a, b) => {
      if (sort === "date") return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
      if (sort === "price-asc") return a.minPriceCents - b.minPriceCents;
      if (sort === "price-desc") return b.minPriceCents - a.minPriceCents;
      return 0;
    });

    return events;
  }, [query, selectedSport, selectedLeague, selectedCity, dateFrom, dateTo, minPrice, maxPrice, sort]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleFilterChange(fn: () => void) {
    fn();
    setPage(1);
  }

  const hasActiveFilters = !!(query || selectedSport || selectedLeague || selectedCity || dateFrom || dateTo || minPrice > 0 || maxPrice < PRICE_STEPS[PRICE_STEPS.length - 1]);

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-body uppercase tracking-widest text-on-surface/40 mb-1">
            Marketplace
          </p>
          <h1 className="font-display font-black text-3xl md:text-4xl text-on-surface tracking-tight uppercase">
            Explorar eventos
          </h1>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* ── Sidebar Filters ─────────────────────────────────────────── */}
          <aside className="w-full lg:w-64 shrink-0">
            <div className="bg-surface-lowest rounded-md p-6 flex flex-col gap-6">
              {/* Text search */}
              <div>
                <label
                  htmlFor="search-query"
                  className="block text-xs font-display font-semibold uppercase tracking-tight text-on-surface/50 mb-2"
                >
                  Busca
                </label>
                <input
                  id="search-query"
                  type="text"
                  placeholder="Time, cidade, torneio…"
                  value={query}
                  onChange={(e) => handleFilterChange(() => setQuery(e.target.value))}
                  className="w-full bg-surface px-4 py-2.5 text-sm text-on-surface font-body rounded-sm border border-outline-variant placeholder:text-on-surface/30 focus:outline-none focus:border-primary transition-colors duration-150"
                />
              </div>

              <FilterSelect
                label="Esporte"
                value={selectedSport}
                onChange={(v) => handleFilterChange(() => setSelectedSport(v as SportType | ""))}
                options={SPORTS.map((s) => ({ value: s.value, label: s.label }))}
              />

              <FilterSelect
                label="Liga / Campeonato"
                value={selectedLeague}
                onChange={(v) => handleFilterChange(() => setSelectedLeague(v))}
                options={LEAGUES.map((l) => ({ value: l, label: l || "Todas as ligas" }))}
              />

              <FilterSelect
                label="Cidade"
                value={selectedCity}
                onChange={(v) => handleFilterChange(() => setSelectedCity(v))}
                options={CITIES.map((c) => ({ value: c, label: c || "Todas as cidades" }))}
              />

              {/* Date range */}
              <div>
                <label className="block text-xs font-display font-semibold uppercase tracking-tight text-on-surface/50 mb-2">
                  Período
                </label>
                <div className="flex flex-col gap-2">
                  <div>
                    <label className="block text-[10px] font-body text-on-surface/40 mb-1">De</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => handleFilterChange(() => setDateFrom(e.target.value))}
                      className="w-full bg-surface px-3 py-2 text-sm text-on-surface font-body rounded-sm border border-outline-variant focus:outline-none focus:border-primary transition-colors duration-150"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-body text-on-surface/40 mb-1">Até</label>
                    <input
                      type="date"
                      value={dateTo}
                      min={dateFrom}
                      onChange={(e) => handleFilterChange(() => setDateTo(e.target.value))}
                      className="w-full bg-surface px-3 py-2 text-sm text-on-surface font-body rounded-sm border border-outline-variant focus:outline-none focus:border-primary transition-colors duration-150"
                    />
                  </div>
                </div>
              </div>

              {/* Price range */}
              <div>
                <label className="block text-xs font-display font-semibold uppercase tracking-tight text-on-surface/50 mb-2">
                  Faixa de preço
                </label>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="block text-[10px] font-body text-on-surface/40 mb-1">
                      Mínimo: {formatCurrency(minPrice)}
                    </label>
                    <input
                      type="range"
                      min={PRICE_STEPS[0]}
                      max={PRICE_STEPS[PRICE_STEPS.length - 1]}
                      step={1000}
                      value={minPrice}
                      onChange={(e) => handleFilterChange(() => setMinPrice(Math.min(Number(e.target.value), maxPrice - 1000)))}
                      className="w-full accent-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-body text-on-surface/40 mb-1">
                      Máximo: {formatCurrency(maxPrice)}
                    </label>
                    <input
                      type="range"
                      min={PRICE_STEPS[0]}
                      max={PRICE_STEPS[PRICE_STEPS.length - 1]}
                      step={1000}
                      value={maxPrice}
                      onChange={(e) => handleFilterChange(() => setMaxPrice(Math.max(Number(e.target.value), minPrice + 1000)))}
                      className="w-full accent-primary"
                    />
                  </div>
                  <div className="flex justify-between text-xs font-body text-on-surface/30">
                    <span>{formatCurrency(PRICE_STEPS[0])}</span>
                    <span>{formatCurrency(PRICE_STEPS[PRICE_STEPS.length - 1])}</span>
                  </div>
                </div>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={() => {
                    setQuery("");
                    setSelectedSport("");
                    setSelectedLeague("");
                    setSelectedCity("");
                    setDateFrom("");
                    setDateTo("");
                    setMinPrice(PRICE_STEPS[0]);
                    setMaxPrice(PRICE_STEPS[PRICE_STEPS.length - 1]);
                    setPage(1);
                  }}
                  className="text-xs font-body text-on-surface/40 hover:text-error underline underline-offset-2 transition-colors duration-150 text-left"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          </aside>

          {/* ── Results ─────────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {/* Sort bar */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm font-body text-on-surface/50">
                <span className="font-semibold text-on-surface">{filtered.length}</span>{" "}
                {filtered.length === 1 ? "evento encontrado" : "eventos encontrados"}
                {totalPages > 1 && (
                  <span className="ml-1 text-on-surface/30">
                    · página {page} de {totalPages}
                  </span>
                )}
              </p>

              <div className="flex items-center gap-2">
                <span className="text-xs font-body text-on-surface/40 hidden sm:block">
                  Ordenar por
                </span>
                <FilterSelect
                  value={sort}
                  onChange={(v) => setSort(v as SortOption)}
                  options={[
                    { value: "date", label: "Data" },
                    { value: "price-asc", label: "Menor preço" },
                    { value: "price-desc", label: "Maior preço" },
                  ]}
                  size="sm"
                />
              </div>
            </div>

            {paginated.length === 0 ? (
              <div className="bg-surface-lowest rounded-md p-16 text-center">
                <p className="font-display font-bold text-xl text-on-surface/20 tracking-tight uppercase">
                  Nenhum evento encontrado
                </p>
                <p className="text-sm text-on-surface/30 font-body mt-2">
                  Tente ajustar os filtros acima.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {paginated.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
                <Pagination
                  page={page}
                  total={filtered.length}
                  limit={PAGE_SIZE}
                  onPageChange={(p) => {
                    setPage(p);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <MainLayout>
          <div className="max-w-7xl mx-auto px-6 py-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <EventCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </MainLayout>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  size = "md",
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  const isActive = value !== "" && value !== options[0]?.value;

  const triggerPadding = size === "sm" ? "px-3 py-1.5" : "px-4 py-2.5";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div className="relative">
      {label && (
        <label className="block text-xs font-display font-semibold uppercase tracking-tight text-on-surface/50 mb-2">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={[
          "w-full flex items-center justify-between gap-2 bg-surface-lowest",
          triggerPadding,
          textSize,
          "font-body text-on-surface rounded-sm border",
          isActive ? "border-primary" : "border-outline-variant",
          "focus:outline-none transition-colors duration-150 cursor-pointer",
        ].join(" ")}
      >
        <span className={isActive ? "font-semibold" : ""}>{selected?.label}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className={[
            "shrink-0 text-on-surface/50 transition-transform duration-200",
            open ? "rotate-180" : "",
          ].join(" ")}
          aria-hidden="true"
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className={[
            "absolute z-50 left-0 right-0 mt-1",
            "bg-surface-lowest border border-outline-variant rounded-sm",
            "shadow-[0_4px_16px_rgba(0,0,0,0.08)]",
            "py-1 max-h-60 overflow-y-auto",
          ].join(" ")}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <li key={opt.value} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={[
                    "w-full flex items-center gap-2.5",
                    size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
                    "font-body text-left transition-colors duration-100",
                    isSelected
                      ? "text-on-surface font-semibold bg-surface"
                      : "text-on-surface/70 hover:bg-surface hover:text-on-surface",
                  ].join(" ")}
                >
                  <span className={["shrink-0 text-[8px] leading-none", isSelected ? "opacity-100" : "opacity-0"].join(" ")}>
                    ■
                  </span>
                  {opt.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
