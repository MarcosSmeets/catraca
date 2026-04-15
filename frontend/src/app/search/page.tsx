"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import MainLayout from "@/components/features/MainLayout";
import EventCard from "@/components/features/EventCard";
import Pagination from "@/components/ui/Pagination";
import { EventCardSkeleton } from "@/components/ui/Skeleton";
import { SportType, formatCurrency } from "@/lib/mock-data";
import { useEvents } from "@/lib/events-api";

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

const SPORT_DEFAULT_LEAGUE: Partial<Record<SportType, string>> = {
  BASKETBALL: "NBB",
  VOLLEYBALL: "Superliga",
};

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function endOfMonthStr(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0];
}

function SearchPageContent() {
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [selectedSport, setSelectedSport] = useState<SportType | "">((searchParams.get("sport") as SportType) ?? "");
  const [selectedLeague, setSelectedLeague] = useState(() => {
    const leagueParam = searchParams.get("league");
    if (leagueParam) return leagueParam;
    const sportParam = searchParams.get("sport") as SportType;
    return SPORT_DEFAULT_LEAGUE[sportParam] ?? "";
  });
  const [selectedCity, setSelectedCity] = useState(searchParams.get("city") ?? "");
  const [sort, setSort] = useState<SortOption>("date");
  const [page, setPage] = useState(1);

  const [dateFrom, setDateFrom] = useState(todayStr);
  const [dateTo, setDateTo] = useState(endOfMonthStr);

  const [minPrice, setMinPrice] = useState(PRICE_STEPS[0]);
  const [maxPrice, setMaxPrice] = useState(PRICE_STEPS[PRICE_STEPS.length - 1]);

  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data, isLoading } = useEvents({
    q: query || undefined,
    sport: selectedSport || undefined,
    league: selectedLeague || undefined,
    city: selectedCity || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    minPrice: minPrice > 0 ? minPrice : undefined,
    maxPrice: maxPrice < PRICE_STEPS[PRICE_STEPS.length - 1] ? maxPrice : undefined,
    sort,
    page,
    limit: PAGE_SIZE,
  });

  const paginated = data?.events ?? [];
  const totalCount = data?.total ?? 0;

  function handleFilterChange(fn: () => void) {
    fn();
    setPage(1);
  }

  function handleSportChange(sport: SportType | "") {
    handleFilterChange(() => {
      setSelectedSport(sport);
      setSelectedLeague(SPORT_DEFAULT_LEAGUE[sport as SportType] ?? "");
    });
  }

  const defaultDateFrom = todayStr();
  const defaultDateTo = endOfMonthStr();

  const hasActiveFilters = !!(
    query ||
    selectedSport ||
    selectedLeague ||
    selectedCity ||
    dateFrom !== defaultDateFrom ||
    dateTo !== defaultDateTo ||
    minPrice > 0 ||
    maxPrice < PRICE_STEPS[PRICE_STEPS.length - 1]
  );

  const activeFilterCount = [
    query,
    selectedSport,
    selectedLeague,
    selectedCity,
    dateFrom !== defaultDateFrom,
    dateTo !== defaultDateTo,
    minPrice > 0,
    maxPrice < PRICE_STEPS[PRICE_STEPS.length - 1],
  ].filter(Boolean).length;

  function clearAllFilters() {
    setQuery("");
    setSelectedSport("");
    setSelectedLeague("");
    setSelectedCity("");
    setDateFrom(todayStr());
    setDateTo(endOfMonthStr());
    setMinPrice(PRICE_STEPS[0]);
    setMaxPrice(PRICE_STEPS[PRICE_STEPS.length - 1]);
    setPage(1);
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-body uppercase tracking-widest text-on-surface/40 mb-1">
              Marketplace
            </p>
            <h1 className="font-display font-black text-3xl md:text-4xl text-on-surface tracking-tight uppercase">
              Explorar eventos
            </h1>
          </div>

          {/* Mobile filter toggle */}
          <button
            className="lg:hidden flex items-center gap-2 px-4 py-2 rounded-sm border border-outline-variant bg-surface-lowest text-sm font-display font-semibold text-on-surface shrink-0"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            aria-controls="search-filters"
          >
            <FilterIcon />
            Filtros
            {activeFilterCount > 0 && (
              <span className="ml-0.5 w-5 h-5 rounded-full bg-accent text-on-accent text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* ── Sidebar Filters ─────────────────────────────────────────── */}
          <aside
            id="search-filters"
            className={[
              "w-full lg:w-64 shrink-0",
              filtersOpen ? "block" : "hidden lg:block",
            ].join(" ")}
          >
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
                  className="w-full bg-surface px-4 py-2.5 text-sm text-on-surface font-body rounded-sm border border-outline-variant placeholder:text-on-surface/30 focus:outline-none focus:border-accent transition-colors duration-150"
                />
              </div>

              <FilterSelect
                label="Esporte"
                value={selectedSport}
                onChange={(v) => handleSportChange(v as SportType | "")}
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
              <DateRangePicker
                dateFrom={dateFrom}
                dateTo={dateTo}
                onChangeFrom={(d) => handleFilterChange(() => setDateFrom(d))}
                onChangeTo={(d) => handleFilterChange(() => setDateTo(d))}
              />

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
                  onClick={clearAllFilters}
                  className="text-xs font-body text-on-surface/40 hover:text-error underline underline-offset-2 transition-colors duration-150 text-left"
                >
                  Limpar filtros
                </button>
              )}

              {/* Mobile close */}
              <button
                className="lg:hidden w-full py-2.5 text-sm font-display font-semibold text-on-surface border border-outline-variant rounded-sm hover:bg-surface-low transition-colors duration-150"
                onClick={() => setFiltersOpen(false)}
              >
                Aplicar filtros
              </button>
            </div>
          </aside>

          {/* ── Results ─────────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {/* Sort bar */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm font-body text-on-surface/50">
                <span className="font-semibold text-on-surface">{totalCount}</span>{" "}
                {totalCount === 1 ? "evento encontrado" : "eventos encontrados"}
                {totalCount > PAGE_SIZE && (
                  <span className="ml-1 text-on-surface/30">
                    · página {page} de {Math.ceil(totalCount / PAGE_SIZE)}
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

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <EventCardSkeleton key={i} />
                ))}
              </div>
            ) : paginated.length === 0 ? (
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
                  total={totalCount}
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

// ─── FilterSelect ────────────────────────────────────────────────────────────

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
          isActive ? "border-accent" : "border-outline-variant",
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

// ─── DateRangePicker ─────────────────────────────────────────────────────────

const MONTH_NAMES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const DAY_NAMES_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

interface DateRangePickerProps {
  dateFrom: string;
  dateTo: string;
  onChangeFrom: (d: string) => void;
  onChangeTo: (d: string) => void;
}

function parseLocalDate(str: string): Date | null {
  if (!str) return null;
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDisplayDate(str: string): string {
  if (!str) return "—";
  const [y, m, d] = str.split("-");
  return `${d}/${m}/${y}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function DateRangePicker({ dateFrom, dateTo, onChangeFrom, onChangeTo }: DateRangePickerProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const initialMonth = parseLocalDate(dateFrom) ?? today;
  const [viewYear, setViewYear] = useState(initialMonth.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialMonth.getMonth());
  // picking state: "from" = next click sets start, "to" = next click sets end
  const [picking, setPicking] = useState<"from" | "to">("from");
  const [hovered, setHovered] = useState<Date | null>(null);

  const fromDate = parseLocalDate(dateFrom);
  const toDate = parseLocalDate(dateTo);

  function goToPrevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }

  function goToNextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  function handleDayClick(day: Date) {
    const dayStr = formatLocalDate(day);
    if (picking === "from") {
      onChangeFrom(dayStr);
      if (toDate && day > toDate) {
        onChangeTo(dayStr);
      }
      setPicking("to");
    } else {
      if (fromDate && day < fromDate) {
        onChangeFrom(dayStr);
        onChangeTo(dateFrom);
      } else {
        onChangeTo(dayStr);
      }
      setPicking("from");
    }
  }

  // Build calendar grid
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  const startOffset = firstDayOfMonth.getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  // Effective "to" for range preview while picking
  const effectiveTo = picking === "to" && hovered && fromDate
    ? (hovered >= fromDate ? hovered : fromDate)
    : toDate;
  const effectiveFrom = picking === "to" && hovered && fromDate
    ? (hovered < fromDate ? hovered : fromDate)
    : fromDate;

  const cells: (Date | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(viewYear, viewMonth, i + 1)),
  ];
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      <label className="block text-xs font-display font-semibold uppercase tracking-tight text-on-surface/50 mb-2">
        Período
      </label>

      {/* Selected range display */}
      <div className="flex items-center gap-2 mb-3 text-[11px] font-body">
        <div
          className={[
            "flex-1 px-2.5 py-1.5 rounded-sm border cursor-pointer transition-colors duration-150",
            picking === "from"
              ? "border-accent bg-surface text-on-surface"
              : "border-outline-variant bg-surface text-on-surface/60",
          ].join(" ")}
          onClick={() => setPicking("from")}
        >
          <span className="text-[9px] uppercase tracking-wider text-on-surface/40 block leading-none mb-0.5">De</span>
          <span className={picking === "from" ? "font-semibold" : ""}>{formatDisplayDate(dateFrom)}</span>
        </div>
        <svg width="10" height="10" viewBox="0 0 10 10" className="shrink-0 text-on-surface/30" aria-hidden="true">
          <path d="M2 5h6M6 3l2 2-2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div
          className={[
            "flex-1 px-2.5 py-1.5 rounded-sm border cursor-pointer transition-colors duration-150",
            picking === "to"
              ? "border-accent bg-surface text-on-surface"
              : "border-outline-variant bg-surface text-on-surface/60",
          ].join(" ")}
          onClick={() => setPicking("to")}
        >
          <span className="text-[9px] uppercase tracking-wider text-on-surface/40 block leading-none mb-0.5">Até</span>
          <span className={picking === "to" ? "font-semibold" : ""}>{formatDisplayDate(dateTo)}</span>
        </div>
      </div>

      {/* Calendar */}
      <div className="border border-outline-variant rounded-sm overflow-hidden">
        {/* Month header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-outline-variant bg-surface">
          <button
            type="button"
            onClick={goToPrevMonth}
            className="p-1 text-on-surface/40 hover:text-on-surface transition-colors duration-150 rounded-sm hover:bg-surface-high"
            aria-label="Mês anterior"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="text-xs font-display font-semibold uppercase tracking-tight text-on-surface">
            {MONTH_NAMES_PT[viewMonth]} {viewYear}
          </span>
          <button
            type="button"
            onClick={goToNextMonth}
            className="p-1 text-on-surface/40 hover:text-on-surface transition-colors duration-150 rounded-sm hover:bg-surface-high"
            aria-label="Próximo mês"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 bg-surface-lowest">
          {DAY_NAMES_PT.map((name) => (
            <div
              key={name}
              className="text-center text-[9px] font-display font-semibold uppercase tracking-wider text-on-surface/30 py-1.5"
            >
              {name[0]}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div
          className="grid grid-cols-7 bg-surface-lowest pb-1"
          onMouseLeave={() => setHovered(null)}
        >
          {cells.map((day, idx) => {
            if (!day) {
              return <div key={`empty-${idx}`} />;
            }

            const dayStr = formatLocalDate(day);
            const isFrom = fromDate ? isSameDay(day, fromDate) : false;
            const isTo = toDate ? isSameDay(day, toDate) : false;
            const isToday = isSameDay(day, today);

            const inRange =
              effectiveFrom && effectiveTo &&
              day > effectiveFrom && day < effectiveTo;

            const isEdge = isFrom || isTo ||
              (effectiveFrom && isSameDay(day, effectiveFrom)) ||
              (effectiveTo && isSameDay(day, effectiveTo));

            const isRangeStart = effectiveFrom ? isSameDay(day, effectiveFrom) : false;
            const isRangeEnd = effectiveTo ? isSameDay(day, effectiveTo) : false;

            // Determine left/right rounding for range band
            const dayOfWeek = day.getDay();
            const isFirstInRow = dayOfWeek === 0 || day.getDate() === 1;
            const isLastInRow = dayOfWeek === 6 || day.getDate() === daysInMonth;

            const showRangeBand = (inRange || isEdge) && effectiveFrom && effectiveTo &&
              !isSameDay(effectiveFrom, effectiveTo);

            const bandRoundLeft = showRangeBand && (isRangeStart || isFirstInRow);
            const bandRoundRight = showRangeBand && (isRangeEnd || isLastInRow);

            return (
              <div
                key={dayStr}
                className="relative flex items-center justify-center py-0.5"
                onMouseEnter={() => picking === "to" && setHovered(day)}
              >
                {/* Range band background */}
                {showRangeBand && (
                  <div
                    className={[
                      "absolute inset-y-0 bg-accent/10",
                      "left-0 right-0",
                      bandRoundLeft ? "rounded-l-full ml-1" : "",
                      bandRoundRight ? "rounded-r-full mr-1" : "",
                    ].join(" ")}
                    aria-hidden="true"
                  />
                )}

                <button
                  type="button"
                  onClick={() => handleDayClick(day)}
                  className={[
                    "relative z-10 w-7 h-7 flex items-center justify-center rounded-full",
                    "text-[11px] font-body transition-colors duration-100",
                    isFrom || isTo || isRangeStart || isRangeEnd
                      ? "bg-accent text-on-accent font-semibold"
                      : inRange
                        ? "text-on-surface hover:bg-accent/20"
                        : "text-on-surface/60 hover:bg-surface-high hover:text-on-surface",
                    isToday && !isFrom && !isTo && !isRangeStart && !isRangeEnd
                      ? "ring-1 ring-accent/40"
                      : "",
                  ].join(" ")}
                  aria-label={`${day.getDate()} de ${MONTH_NAMES_PT[day.getMonth()]} de ${day.getFullYear()}`}
                  aria-pressed={isFrom || isTo}
                >
                  {day.getDate()}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Picking hint */}
      <p className="mt-1.5 text-[10px] font-body text-on-surface/30 text-center">
        {picking === "from" ? "Clique para escolher a data inicial" : "Clique para escolher a data final"}
      </p>
    </div>
  );
}

function FilterIcon() {
  return (
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
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="11" y1="18" x2="13" y2="18" />
    </svg>
  );
}
