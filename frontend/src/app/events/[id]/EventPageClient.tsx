"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import MainLayout from "@/components/features/MainLayout";
import StadiumMap from "@/components/features/StadiumMap";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { SeatMapSkeleton } from "@/components/ui/Skeleton";
import {
  Seat,
  formatCurrency,
  formatDate,
  sportLabel,
} from "@/lib/mock-data";
import { useEvent, useEventSeats } from "@/lib/events-api";
import { useSeatAvailability } from "@/hooks/useSeatAvailability";
import { useCartStore } from "@/store/cart";
import { useAuthStore } from "@/store/auth";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

export default function EventPageClient({ id }: { id: string }) {
  const { data: event, isLoading: eventLoading } = useEvent(id);
  const { data: seats = [], isLoading: seatsLoading } = useEventSeats(id);
  useSeatAvailability(id);

  if (eventLoading) {
    return (
      <MainLayout>
        <div className="h-80 bg-surface-dim animate-pulse" />
        <div className="max-w-7xl mx-auto px-6 py-10">
          <SeatMapSkeleton />
        </div>
      </MainLayout>
    );
  }
  if (!event) return null;

  return <EventPageInner event={event} seats={seats} seatsLoading={seatsLoading} />;
}

function EventPageInner({
  event,
  seats,
  seatsLoading,
}: {
  event: NonNullable<ReturnType<typeof useEvent>["data"]>;
  seats: Seat[];
  seatsLoading: boolean;
}) {
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const router = useRouter();
  const addSeats = useCartStore((s) => s.addSeats);
  const setReservation = useCartStore((s) => s.setReservation);
  const accessToken = useAuthStore((s) => s.accessToken);

  const SPORT_FALLBACK: Record<string, string> = {
    FOOTBALL: "/placeholder-event.svg",
    BASKETBALL: "/placeholder-event.svg",
    VOLLEYBALL: "/placeholder-event.svg",
    FUTSAL: "/placeholder-event.svg",
    ATHLETICS: "/placeholder-event.svg",
  };
  const eventImage = event.imageUrl || SPORT_FALLBACK[event.sport] || "/placeholder-event.svg";

  const gallery = (event.venue as { galleryUrls?: string[] }).galleryUrls?.length
    ? (event.venue as { galleryUrls?: string[] }).galleryUrls!
    : [eventImage];

  const [heroImgSrc, setHeroImgSrc] = useState(eventImage);
  const [gallerySrcs, setGallerySrcs] = useState(gallery);

  const isSoldOut = event.status === "SOLD_OUT";
  const subtotalCents = selectedSeats.reduce((sum, s) => sum + s.priceCents, 0);
  const feeCents = Math.round(subtotalCents * (event.serviceFeePercent / 100));
  const totalCents = subtotalCents + feeCents;

  async function handleAddToCart() {
    if (selectedSeats.length === 0) return;
    addSeats(selectedSeats, event);
    try {
      const res = await apiFetch<{ reservations: { id: string; expiresAt: string }[]; expiresAt: string }>(
        "/reservations",
        {
          method: "POST",
          accessToken,
          body: JSON.stringify({
            eventId: event.id,
            seatIds: selectedSeats.map((s) => s.id),
          }),
        }
      );
      setReservation(res.reservations.map((r) => r.id), res.expiresAt);
    } catch {
      toast.error("Não foi possível reservar no servidor. Tente novamente.");
    }
    toast.success(
      `${selectedSeats.length} assento${selectedSeats.length > 1 ? "s" : ""} adicionado${selectedSeats.length > 1 ? "s" : ""} ao carrinho`
    );
    router.push("/cart");
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({
        title: event.title,
        text: `${event.homeTeam} vs ${event.awayTeam} — ${event.venue.name}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copiado para a área de transferência");
    }
  }

  async function handleWaitlist(e: React.FormEvent) {
    e.preventDefault();
    await new Promise((r) => setTimeout(r, 600));
    setWaitlistSubmitted(true);
    toast.success("Você entrou na lista de espera!");
  }

  return (
    <MainLayout>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="relative bg-primary overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={heroImgSrc}
            alt={`${event.homeTeam} vs ${event.awayTeam} em ${event.venue.name}`}
            fill
            priority
            className="object-cover opacity-20"
            sizes="100vw"
            onError={() => setHeroImgSrc("/placeholder-event.svg")}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-primary/40 via-primary/70 to-primary" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-16 pb-24">
          <div className="flex items-center gap-2 mb-8 text-on-primary/40 text-xs font-body">
            <Link href="/" className="hover:text-on-primary transition-colors">Início</Link>
            <span>/</span>
            <Link href="/search" className="hover:text-on-primary transition-colors">Explorar</Link>
            <span>/</span>
            <span className="text-on-primary/60 truncate max-w-[200px]">{event.title}</span>
          </div>

          <div className="flex flex-wrap items-start gap-3 mb-4">
            <Badge label={sportLabel(event.sport)} variant="status" />
            <Badge label={event.league} variant="outline" className="border-on-primary/20 text-on-primary/60" />
            {isSoldOut && <Badge label="Esgotado" variant="status" />}
            {event.vibeChips?.filter((c) => c !== "Esgotado").map((chip) => (
              <Badge key={chip} label={chip} variant="vibe" />
            ))}
          </div>

          <h1 className="font-display font-black text-3xl md:text-5xl text-on-primary tracking-tight leading-none uppercase mb-2">
            {event.homeTeam}
          </h1>
          <p className="font-display font-bold text-xl md:text-3xl text-on-primary/50 tracking-tight uppercase mb-6">
            vs {event.awayTeam}
          </p>

          <div className="flex flex-wrap gap-6 text-sm text-on-primary/60 font-body mb-6">
            <div className="flex items-center gap-2">
              <CalendarIcon />
              <span>{formatDate(event.startsAt)}</span>
            </div>
            <div className="flex items-center gap-2">
              <LocationIcon />
              <span>
                {event.venue.name} · {event.venue.city}, {event.venue.state}
              </span>
            </div>
          </div>

          <button
            onClick={handleShare}
            className="flex items-center gap-2 text-on-primary/50 hover:text-on-primary transition-colors duration-150 text-xs font-body"
            aria-label="Compartilhar evento"
          >
            <ShareIcon />
            Compartilhar
          </button>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 py-10 pb-28 lg:pb-10">
        <div className="flex flex-col lg:flex-row gap-10">
          <div className="flex-1 min-w-0 flex flex-col gap-8">
            {/* Venue gallery */}
            <div className="bg-surface-lowest rounded-md overflow-hidden border border-outline-variant">
              {/* Photo slider */}
              <div className="relative h-52 bg-surface-dim">
                <Image
                  src={gallerySrcs[galleryIndex]}
                  alt={`${event.venue.name} — foto ${galleryIndex + 1}`}
                  fill
                  className="object-cover transition-opacity duration-300"
                  sizes="800px"
                  priority={galleryIndex === 0}
                  onError={() =>
                    setGallerySrcs((prev) => {
                      const next = [...prev];
                      next[galleryIndex] = "/placeholder-event.svg";
                      return next;
                    })
                  }
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {/* Prev / Next arrows */}
                {gallery.length > 1 && (
                  <>
                    <button
                      onClick={() =>
                        setGalleryIndex((i) => (i - 1 + gallery.length) % gallery.length)
                      }
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors duration-150"
                      aria-label="Foto anterior"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="15 18 9 12 15 6" />
                      </svg>
                    </button>
                    <button
                      onClick={() =>
                        setGalleryIndex((i) => (i + 1) % gallery.length)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors duration-150"
                      aria-label="Próxima foto"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  </>
                )}

                {/* Dot indicators */}
                {gallery.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {gallery.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setGalleryIndex(idx)}
                        className={`w-1.5 h-1.5 rounded-full transition-all duration-150 ${
                          idx === galleryIndex ? "bg-white w-4" : "bg-white/40 hover:bg-white/70"
                        }`}
                        aria-label={`Ir para foto ${idx + 1}`}
                      />
                    ))}
                  </div>
                )}

                {/* Venue name overlay */}
                <div className="absolute bottom-5 left-4">
                  <p className="font-display font-black text-white text-lg uppercase tracking-tight drop-shadow leading-none">
                    {event.venue.name}
                  </p>
                  <p className="text-white/60 text-xs font-body mt-0.5">
                    {event.venue.city}, {event.venue.state}
                  </p>
                </div>
              </div>

              {/* Venue stats */}
              <div className="flex items-center divide-x divide-outline-variant">
                <div className="flex-1 px-4 py-3 text-center">
                  <p className="text-[10px] font-body text-on-surface/40 uppercase tracking-wider mb-0.5">
                    Capacidade
                  </p>
                  <p className="font-display font-bold text-sm text-on-surface">
                    {event.venue.capacity.toLocaleString("pt-BR")}
                  </p>
                </div>
                <div className="flex-1 px-4 py-3 text-center">
                  <p className="text-[10px] font-body text-on-surface/40 uppercase tracking-wider mb-0.5">
                    Cidade
                  </p>
                  <p className="font-display font-bold text-sm text-on-surface">
                    {event.venue.city}
                  </p>
                </div>
                <div className="flex-1 px-4 py-3 text-center">
                  <p className="text-[10px] font-body text-on-surface/40 uppercase tracking-wider mb-0.5">
                    Fotos
                  </p>
                  <p className="font-display font-bold text-sm text-on-surface">
                    {gallery.length}
                  </p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-surface-lowest rounded-md p-6">
              <button
                onClick={() => setShowDescription((v) => !v)}
                className="flex items-center justify-between w-full text-left"
                aria-expanded={showDescription}
                aria-controls="event-description"
              >
                <h3 className="font-display font-bold text-sm uppercase tracking-tight text-on-surface">
                  Informações e regulamento
                </h3>
                <ChevronIcon open={showDescription} />
              </button>
              {showDescription && (
                <div id="event-description" className="mt-4 text-sm font-body text-on-surface/60 leading-relaxed space-y-2">
                  <p>Portões abrem 2 horas antes do início da partida. Apresente o QR code do ingresso na entrada.</p>
                  <p>É obrigatório o uso de máscara em áreas cobertas. Não é permitido o porte de objetos cortantes, bebidas alcoólicas externas ou torcida adversária no setor do time da casa.</p>
                  <p>Ingressos são pessoais e intransferíveis, exceto via plataforma Catraca.</p>
                </div>
              )}
            </div>

            {/* Seat Map */}
            <div>
              <div className="mb-6">
                <p className="text-xs font-body uppercase tracking-widest text-on-surface/40 mb-1">
                  Escolha seus assentos
                </p>
                <h2 className="font-display font-bold text-xl text-on-surface tracking-tight uppercase">
                  {event.sport === "BASKETBALL" ? "Mapa da arena" : "Mapa do estádio"}
                </h2>
              </div>

              {isSoldOut ? (
                <div className="bg-surface-lowest rounded-md p-12 text-center">
                  <p className="font-display font-black text-2xl text-error tracking-tight uppercase mb-2">
                    Esgotado
                  </p>
                  <p className="text-sm font-body text-on-surface/40 mb-8">
                    Todos os ingressos para este evento foram vendidos.
                  </p>
                  {!waitlistSubmitted ? (
                    <form onSubmit={handleWaitlist} className="max-w-sm mx-auto">
                      <p className="text-sm font-display font-semibold text-on-surface tracking-tight mb-3">
                        Entrar na lista de espera
                      </p>
                      <p className="text-xs font-body text-on-surface/40 mb-4">
                        Avise-me se houver ingressos disponíveis.
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="email"
                          required
                          placeholder="seu@email.com.br"
                          value={waitlistEmail}
                          onChange={(e) => setWaitlistEmail(e.target.value)}
                          className="flex-1 bg-surface px-4 py-2.5 text-sm text-on-surface font-body rounded-sm border border-outline-variant placeholder:text-on-surface/30 focus:outline-none focus:border-primary transition-colors duration-150"
                          aria-label="E-mail para lista de espera"
                        />
                        <Button type="submit" size="sm">Entrar</Button>
                      </div>
                    </form>
                  ) : (
                    <p className="text-sm font-body text-on-surface/60">
                      ✓ Você está na lista de espera. Te avisamos se aparecer um ingresso!
                    </p>
                  )}
                </div>
              ) : seatsLoading ? (
                <SeatMapSkeleton />
              ) : (
                <StadiumMap
                  seats={seats}
                  venue={event.venue}
                  onSelectionChange={setSelectedSeats}
                  maxSelectable={6}
                  sport={event.sport}
                />
              )}
            </div>
          </div>

          {/* ── Order Panel ───────────────────────────────────────────────── */}
          <aside className="hidden lg:block w-full lg:w-80 shrink-0">
            <div className="bg-surface-lowest rounded-md p-6 sticky top-20">
              <h3 className="font-display font-bold text-base uppercase tracking-tight text-on-surface mb-5">
                Resumo do pedido
              </h3>

              {selectedSeats.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-on-surface/30 font-body">
                    Selecione um ou mais assentos no mapa ao lado.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-2 mb-5">
                    {selectedSeats.map((seat) => (
                      <div key={seat.id} className="flex items-center justify-between text-sm">
                        <span className="font-body text-on-surface/70">
                          {seat.section} · {seat.row}{seat.number}
                        </span>
                        <span className="font-body font-medium text-on-surface">
                          {formatCurrency(seat.priceCents)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-outline-variant pt-4 mb-5 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-body text-on-surface/50">Subtotal</span>
                      <span className="font-body text-on-surface">{formatCurrency(subtotalCents)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-body text-on-surface/50">
                        Taxa de serviço ({event.serviceFeePercent}%)
                      </span>
                      <span className="font-body text-on-surface">{formatCurrency(feeCents)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-display font-bold text-base tracking-tight text-on-surface uppercase">Total</span>
                      <span className="font-display font-black text-xl tracking-tight text-on-surface">
                        {formatCurrency(totalCents)}
                      </span>
                    </div>
                  </div>
                </>
              )}

              <Button
                fullWidth
                size="lg"
                disabled={selectedSeats.length === 0 || isSoldOut}
                onClick={handleAddToCart}
              >
                {isSoldOut
                  ? "Esgotado"
                  : selectedSeats.length === 0
                  ? "Selecione um assento"
                  : `Adicionar ao carrinho (${selectedSeats.length})`}
              </Button>

              <p className="text-[11px] text-on-surface/30 font-body text-center mt-3 leading-relaxed">
                Seus assentos serão reservados por 10 minutos após adicionar ao carrinho.
              </p>

              <div className="mt-4 pt-4 border-t border-outline-variant">
                <Link
                  href="/search"
                  className="text-xs font-body text-on-surface/40 hover:text-on-surface transition-colors duration-150 underline underline-offset-2"
                >
                  ← Ver outros eventos
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ── Mobile sticky CTA ─────────────────────────────────────────────── */}
      {selectedSeats.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface-lowest border-t border-outline-variant px-4 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-body text-on-surface/50">
              {selectedSeats.length} assento{selectedSeats.length > 1 ? "s" : ""}
            </p>
            <p className="font-display font-black text-base tracking-tight text-on-surface">
              {formatCurrency(totalCents)}
            </p>
          </div>
          <button
            onClick={handleAddToCart}
            className="shrink-0 px-5 py-3 bg-gradient-to-br from-primary to-primary-container text-on-primary text-sm font-display font-bold tracking-tight rounded-sm hover:opacity-90 transition-opacity duration-150"
          >
            Adicionar ao carrinho
          </button>
        </div>
      )}
    </MainLayout>
  );
}

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform duration-200 text-on-surface/40 ${open ? "rotate-180" : ""}`}
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
