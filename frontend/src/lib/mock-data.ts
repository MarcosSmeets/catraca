// ─── Type Definitions ─────────────────────────────────────────────────────────
// These types mirror the API response shapes and are used throughout the app.

export type SportType =
  | "FOOTBALL"
  | "BASKETBALL"
  | "VOLLEYBALL"
  | "FUTSAL"
  | "ATHLETICS";

export type EventStatus = "DRAFT" | "ON_SALE" | "SOLD_OUT" | "CANCELLED" | "EXPIRED";

export type SeatStatus = "AVAILABLE" | "RESERVED" | "SOLD" | "BLOCKED";

export type OrderStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export type ReservationStatus = "ACTIVE" | "EXPIRED" | "CONVERTED";

export interface Venue {
  id: string;
  name: string;
  city: string;
  state: string;
  capacity: number;
}

export interface Event {
  id: string;
  title: string;
  sport: SportType;
  league: string;
  venue: Venue;
  startsAt: string;
  status: EventStatus;
  serviceFeePercent: number;
  homeTeam: string;
  awayTeam: string;
  imageUrl: string;
  minPriceCents: number;
  maxPriceCents: number;
  vibeChips?: string[];
}

export interface Seat {
  id: string;
  eventId: string;
  section: string;
  row: string;
  number: string;
  priceCents: number;
  status: SeatStatus;
  col: number;
  rowIndex: number;
}

export interface Reservation {
  id: string;
  seatId: string;
  userId: string;
  expiresAt: string;
  status: ReservationStatus;
}

export interface Order {
  id: string;
  userId: string;
  reservationIds: string[];
  totalCents: number;
  stripePaymentId: string;
  status: OrderStatus;
  createdAt: string;
}

export interface Ticket {
  id: string;
  orderId: string;
  eventId: string;
  seatId: string;
  qrCode: string;
  status: "VALID" | "USED" | "CANCELLED";
  purchasedAt: string;
  /** Populated by the API via JOIN — present on list/get endpoints */
  event?: {
    id: string;
    homeTeam: string;
    awayTeam: string;
    league: string;
    sport: string;
    startsAt: string;
    imageUrl: string;
    venueName: string;
    venueCity: string;
  };
  seat?: {
    id: string;
    section: string;
    row: string;
    number: string;
    priceCents: number;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  cpf: string;
  phone: string;
  role: string;
  createdAt: string;
}

// ─── Utility Functions ────────────────────────────────────────────────────────

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

export function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

export function sportLabel(sport: SportType): string {
  const labels: Record<SportType, string> = {
    FOOTBALL: "Futebol",
    BASKETBALL: "Basquete",
    VOLLEYBALL: "Vôlei",
    FUTSAL: "Futsal",
    ATHLETICS: "Atletismo",
  };
  return labels[sport];
}
