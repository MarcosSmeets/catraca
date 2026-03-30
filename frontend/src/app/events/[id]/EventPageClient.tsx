"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import MainLayout from "@/components/features/MainLayout";
import StadiumMap from "@/components/features/StadiumMap";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import {
  mockEvents,
  mockSeats,
  Seat,
  formatCurrency,
  formatDate,
  sportLabel,
} from "@/lib/mock-data";
import { useCartStore } from "@/store/cart";
import { toast } from "sonner";

export default function EventPageClient({ id }: { id: string }) {
  const event = mockEvents.find((e) => e.id === id);
  if (!event) {
    notFound();
    return null;
  }
  return <EventPageInner event={event} />;
}

function EventPageInner({ event }: { event: NonNullable<ReturnType<typeof mockEvents.find>> }) {
  const seats = mockSeats[event.id] ?? [];
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const router = useRouter();
  const addSeats = useCartStore((s) => s.addSeats);

  const gallery = event.venue.galleryUrls?.length
    ? event.venue.galleryUrls
    : [event.imageUrl];

  const isSoldOut = event.status === "SOLD_OUT";
  const subtotalCents = selectedSeats.reduce((sum, s) => sum + s.priceCents, 0);
  const feeCents = Math.round(subtotalCents * (event.serviceFeePercent / 100));
  const totalCents = subtotalCents + feeCents;

  function handleAddToCart() {
    if (selectedSeats.length === 0) return;
    addSeats(selectedSeats, event);
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
            src={event.imageUrl}
            alt={`${event.homeTeam} vs ${event.awayTeam} em ${event.venue.name}`}
            fill
            priority
            className="object-cover opacity-20"
            sizes="100vw"
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
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col lg:flex-row gap-10">
          <div className="flex-1 min-w-0 flex flex-col gap-8">
            {/* Venue overview */}
            <div className="bg-surface-lowest rounded-md overflow-hidden">
              <div className="relative h-40 bg-surface-dim">
                <Image
                  src={event.imageUrl}
                  alt={`Vista do ${event.venue.name}`}
                  fill
                  className="object-cover opacity-50"
                  sizes="800px"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="font-display font-black text-on-surface text-xl uppercase tracking-tight drop-shadow">
                      {event.venue.name}
                    </p>
                    <p className="text-xs font-body text-on-surface/60 mt-1">
                      {event.venue.city}, {event.venue.state} · {event.venue.capacity.toLocaleString("pt-BR")} lugares
                    </p>
                  </div>
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
                  Mapa do estádio
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
              ) : (
                <SeatMap
                  seats={seats}
                  onSelectionChange={setSelectedSeats}
                  maxSelectable={6}
                />
              )}
            </div>
          </div>

          {/* ── Order Panel ───────────────────────────────────────────────── */}
          <aside className="w-full lg:w-80 shrink-0">
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
