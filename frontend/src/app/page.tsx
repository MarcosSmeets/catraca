import Image from "next/image";
import Link from "next/link";
import MainLayout from "@/components/features/MainLayout";
import EventCard from "@/components/features/EventCard";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { mockEvents, sportLabel, SportType } from "@/lib/mock-data";

const SPORT_FILTERS: { sport: SportType | "ALL"; label: string }[] = [
  { sport: "ALL", label: "Todos" },
  { sport: "FOOTBALL", label: "Futebol" },
  { sport: "BASKETBALL", label: "Basquete" },
  { sport: "VOLLEYBALL", label: "Vôlei" },
  { sport: "FUTSAL", label: "Futsal" },
];

const HERO_EVENT = mockEvents[0];
const FEATURED = mockEvents.slice(0, 4);
const UPCOMING = mockEvents.slice(4);

export default function HomePage() {
  return (
    <MainLayout>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-primary">
        <div className="absolute inset-0">
          <Image
            src={HERO_EVENT.imageUrl}
            alt={HERO_EVENT.title}
            fill
            priority
            className="object-cover opacity-30"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/80 to-transparent" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-24 md:py-32">
          <div className="max-w-xl">
            {/* Eyebrow */}
            <div className="flex items-center gap-3 mb-6">
              <Badge label={HERO_EVENT.league} variant="vibe" />
              <span className="text-on-primary/50 text-xs font-body uppercase tracking-widest">
                Em destaque
              </span>
            </div>

            {/* Title */}
            <h1 className="font-display font-black text-4xl md:text-6xl text-on-primary tracking-tight leading-none uppercase mb-2">
              {HERO_EVENT.homeTeam}
            </h1>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-on-primary/40 font-display font-bold text-2xl md:text-4xl uppercase tracking-tight">
                vs
              </span>
            </div>
            <h2 className="font-display font-black text-4xl md:text-6xl text-on-primary/70 tracking-tight leading-none uppercase mb-8">
              {HERO_EVENT.awayTeam}
            </h2>

            {/* Meta */}
            <p className="text-on-primary/50 text-sm font-body mb-8">
              {HERO_EVENT.venue.name} · {HERO_EVENT.venue.city},{" "}
              {HERO_EVENT.venue.state}
            </p>

            {/* CTA */}
            <Link href={`/events/${HERO_EVENT.id}`}>
              <Button size="lg" variant="secondary">
                Ver Ingressos
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Sport Category Chips ─────────────────────────────────────────── */}
      <section className="bg-surface-low">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
            {SPORT_FILTERS.map(({ sport, label }) => (
              <Link
                key={sport}
                href={sport === "ALL" ? "/search" : `/search?sport=${sport}`}
                className="shrink-0 px-4 py-2 rounded-full text-xs font-display font-semibold uppercase tracking-tight transition-colors duration-150 bg-surface-lowest text-on-surface hover:bg-primary hover:text-on-primary"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Events Grid ─────────────────────────────────────────── */}
      <section className="bg-surface py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-xs font-body uppercase tracking-widest text-on-surface/40 mb-1">
                Jogos da semana
              </p>
              <h2 className="font-display font-black text-2xl md:text-3xl text-on-surface tracking-tight uppercase">
                Em alta agora
              </h2>
            </div>
            <Link
              href="/search"
              className="text-sm font-body text-on-surface/50 hover:text-on-surface transition-colors duration-150 underline underline-offset-4"
            >
              Ver todos
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURED.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Upcoming Events ──────────────────────────────────────────────── */}
      <section className="bg-surface-low py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-8">
            <p className="text-xs font-body uppercase tracking-widest text-on-surface/40 mb-1">
              Próximos eventos
            </p>
            <h2 className="font-display font-black text-2xl md:text-3xl text-on-surface tracking-tight uppercase">
              No calendário
            </h2>
          </div>

          <div className="flex flex-col gap-0">
            {UPCOMING.map((event, idx) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="group block"
              >
                <div
                  className={[
                    "flex items-center gap-6 py-5 transition-colors duration-150",
                    idx < UPCOMING.length - 1
                      ? "border-b border-outline-variant"
                      : "",
                    "hover:bg-surface-lowest px-4 -mx-4 rounded-sm",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {/* Event image thumb */}
                  <div className="relative w-16 h-16 rounded-sm overflow-hidden bg-surface-dim shrink-0">
                    <Image
                      src={event.imageUrl}
                      alt={event.title}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Badge
                        label={sportLabel(event.sport)}
                        variant="outline"
                        className="text-[10px] py-0.5"
                      />
                      <span className="text-xs text-on-surface/40 font-body">
                        {event.league}
                      </span>
                    </div>
                    <p className="font-display font-bold text-sm text-on-surface tracking-tight truncate">
                      {event.homeTeam}{" "}
                      <span className="text-on-surface/40 font-normal">vs</span>{" "}
                      {event.awayTeam}
                    </p>
                    <p className="text-xs text-on-surface/40 font-body mt-0.5 truncate">
                      {event.venue.name} · {event.venue.city}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-on-surface/40 font-body">
                      A partir de
                    </p>
                    <p className="font-display font-bold text-sm text-on-surface tracking-tight">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(event.minPriceCents / 100)}
                    </p>
                  </div>

                  {/* Arrow */}
                  <svg
                    className="w-4 h-4 text-on-surface/30 shrink-0 group-hover:text-on-surface transition-colors duration-150"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 18l6-6-6-6"
                    />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="bg-primary py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-display font-black text-lg tracking-tight text-on-primary uppercase">
            Catraca
          </span>
          <p className="text-on-primary/30 text-xs font-body text-center">
            © 2026 Catraca. O marketplace do torcedor brasileiro.
          </p>
          <div className="flex gap-6">
            {["Termos", "Privacidade", "Contato"].map((item) => (
              <a
                key={item}
                href="#"
                className="text-xs text-on-primary/40 hover:text-on-primary font-body transition-colors duration-150"
              >
                {item}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </MainLayout>
  );
}
