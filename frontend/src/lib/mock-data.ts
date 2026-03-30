export type SportType =
  | "FOOTBALL"
  | "BASKETBALL"
  | "VOLLEYBALL"
  | "FUTSAL"
  | "ATHLETICS";

export type EventStatus = "DRAFT" | "ON_SALE" | "SOLD_OUT" | "CANCELLED";

export type SeatStatus = "AVAILABLE" | "RESERVED" | "SOLD" | "BLOCKED";

export type OrderStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export type ReservationStatus = "ACTIVE" | "EXPIRED" | "CONVERTED";

export interface Venue {
  id: string;
  name: string;
  city: string;
  state: string;
  capacity: number;
  imageUrl: string;
  galleryUrls: string[];
  sectionPhotos: Record<string, string>;
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
  event: Event;
  seats: Seat[];
}

export interface Ticket {
  id: string;
  orderId: string;
  event: Event;
  seat: Seat;
  qrCode: string;
  status: "VALID" | "USED" | "CANCELLED";
  purchasedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  cpf: string;
  phone: string;
  createdAt: string;
}

// ─── Mock Data ─────────────────────────────────────────────────────────────────

const SECTION_PHOTOS: Record<string, string> = {
  Norte:
    "https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=600&q=80",
  Sul: "https://images.unsplash.com/photo-1551958219-acbc595d5afe?w=600&q=80",
  "Leste Premium":
    "https://images.unsplash.com/photo-1464983953574-0892a716854b?w=600&q=80",
  "Oeste Premium":
    "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&q=80",
  "Cadeiras Superiores":
    "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=600&q=80",
};

export const mockVenues: Venue[] = [
  {
    id: "venue-1",
    name: "Arena MRV",
    city: "Belo Horizonte",
    state: "MG",
    capacity: 46000,
    imageUrl:
      "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1200&q=80",
    galleryUrls: [
      "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=900&q=80",
      "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=900&q=80",
      "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=900&q=80",
    ],
    sectionPhotos: SECTION_PHOTOS,
  },
  {
    id: "venue-2",
    name: "Neo Química Arena",
    city: "São Paulo",
    state: "SP",
    capacity: 49205,
    imageUrl:
      "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=1200&q=80",
    galleryUrls: [
      "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=900&q=80",
      "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=900&q=80",
      "https://images.unsplash.com/photo-1553778263-73a83bab9b0c?w=900&q=80",
    ],
    sectionPhotos: SECTION_PHOTOS,
  },
  {
    id: "venue-3",
    name: "Maracanã",
    city: "Rio de Janeiro",
    state: "RJ",
    capacity: 78838,
    imageUrl:
      "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&q=80",
    galleryUrls: [
      "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=900&q=80",
      "https://images.unsplash.com/photo-1553778263-73a83bab9b0c?w=900&q=80",
      "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=900&q=80",
    ],
    sectionPhotos: SECTION_PHOTOS,
  },
  {
    id: "venue-4",
    name: "Ginásio do Ibirapuera",
    city: "São Paulo",
    state: "SP",
    capacity: 8000,
    imageUrl:
      "https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=1200&q=80",
    galleryUrls: [
      "https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=900&q=80",
      "https://images.unsplash.com/photo-1546519638405-a9d1b2e7c6b7?w=900&q=80",
    ],
    sectionPhotos: {
      Norte: "https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=600&q=80",
      Sul: "https://images.unsplash.com/photo-1551958219-acbc595d5afe?w=600&q=80",
      "Leste Premium":
        "https://images.unsplash.com/photo-1464983953574-0892a716854b?w=600&q=80",
      "Oeste Premium":
        "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&q=80",
      "Cadeiras Superiores":
        "https://images.unsplash.com/photo-1546519638405-a9d1b2e7c6b7?w=600&q=80",
    },
  },
  {
    id: "venue-5",
    name: "Arena da Baixada",
    city: "Curitiba",
    state: "PR",
    capacity: 42372,
    imageUrl:
      "https://images.unsplash.com/photo-1553778263-73a83bab9b0c?w=1200&q=80",
    galleryUrls: [
      "https://images.unsplash.com/photo-1553778263-73a83bab9b0c?w=900&q=80",
      "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=900&q=80",
    ],
    sectionPhotos: SECTION_PHOTOS,
  },
  {
    id: "venue-6",
    name: "Castelão",
    city: "Fortaleza",
    state: "CE",
    capacity: 63903,
    imageUrl:
      "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&q=80",
    galleryUrls: [
      "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=900&q=80",
      "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=900&q=80",
    ],
    sectionPhotos: SECTION_PHOTOS,
  },
];

const SPORT_IMAGES: Record<SportType, string[]> = {
  FOOTBALL: [
    "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800&q=80",
    "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&q=80",
    "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80",
    "https://images.unsplash.com/photo-1553778263-73a83bab9b0c?w=800&q=80",
  ],
  BASKETBALL: [
    "https://images.unsplash.com/photo-1546519638405-a9d1b2e7c6b7?w=800&q=80",
    "https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=800&q=80",
  ],
  VOLLEYBALL: [
    "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800&q=80",
  ],
  FUTSAL: [
    "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80",
  ],
  ATHLETICS: [
    "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=800&q=80",
  ],
};

function pickImage(sport: SportType, idx: number): string {
  const imgs = SPORT_IMAGES[sport];
  return imgs[idx % imgs.length];
}

export const mockEvents: Event[] = [
  {
    id: "event-1",
    title: "Atletico MG vs Flamengo",
    sport: "FOOTBALL",
    league: "Série A",
    venue: mockVenues[0],
    startsAt: "2026-04-12T16:00:00-03:00",
    status: "ON_SALE",
    serviceFeePercent: 10,
    homeTeam: "Atlético MG",
    awayTeam: "Flamengo",
    imageUrl: pickImage("FOOTBALL", 0),
    minPriceCents: 4000,
    maxPriceCents: 28000,
    vibeChips: ["Vendendo Rápido"],
  },
  {
    id: "event-2",
    title: "Corinthians vs Palmeiras",
    sport: "FOOTBALL",
    league: "Série A",
    venue: mockVenues[1],
    startsAt: "2026-04-19T17:00:00-03:00",
    status: "ON_SALE",
    serviceFeePercent: 10,
    homeTeam: "Corinthians",
    awayTeam: "Palmeiras",
    imageUrl: pickImage("FOOTBALL", 1),
    minPriceCents: 6000,
    maxPriceCents: 35000,
    vibeChips: ["Clássico", "Vendendo Rápido"],
  },
  {
    id: "event-3",
    title: "Flamengo vs Fluminense",
    sport: "FOOTBALL",
    league: "Série A",
    venue: mockVenues[2],
    startsAt: "2026-04-26T18:30:00-03:00",
    status: "SOLD_OUT",
    serviceFeePercent: 10,
    homeTeam: "Flamengo",
    awayTeam: "Fluminense",
    imageUrl: pickImage("FOOTBALL", 2),
    minPriceCents: 8000,
    maxPriceCents: 45000,
    vibeChips: ["Esgotado", "Clássico"],
  },
  {
    id: "event-4",
    title: "Flamengo Basquete vs Franca",
    sport: "BASKETBALL",
    league: "NBB",
    venue: mockVenues[3],
    startsAt: "2026-04-15T20:00:00-03:00",
    status: "ON_SALE",
    serviceFeePercent: 8,
    homeTeam: "Flamengo Basquete",
    awayTeam: "Franca",
    imageUrl: pickImage("BASKETBALL", 0),
    minPriceCents: 3000,
    maxPriceCents: 12000,
    vibeChips: ["Final"],
  },
  {
    id: "event-5",
    title: "Athletico PR vs Grêmio",
    sport: "FOOTBALL",
    league: "Série A",
    venue: mockVenues[4],
    startsAt: "2026-05-03T16:00:00-03:00",
    status: "ON_SALE",
    serviceFeePercent: 10,
    homeTeam: "Athletico PR",
    awayTeam: "Grêmio",
    imageUrl: pickImage("FOOTBALL", 3),
    minPriceCents: 3500,
    maxPriceCents: 20000,
  },
  {
    id: "event-6",
    title: "Fortaleza vs Ceará",
    sport: "FOOTBALL",
    league: "Série A",
    venue: mockVenues[5],
    startsAt: "2026-05-10T19:00:00-03:00",
    status: "ON_SALE",
    serviceFeePercent: 10,
    homeTeam: "Fortaleza",
    awayTeam: "Ceará",
    imageUrl: pickImage("FOOTBALL", 0),
    minPriceCents: 2500,
    maxPriceCents: 15000,
    vibeChips: ["Clássico Nordestino"],
  },
  {
    id: "event-7",
    title: "Minas Tênis vs Sada Cruzeiro",
    sport: "VOLLEYBALL",
    league: "Superliga",
    venue: mockVenues[3],
    startsAt: "2026-04-20T15:00:00-03:00",
    status: "ON_SALE",
    serviceFeePercent: 8,
    homeTeam: "Minas Tênis",
    awayTeam: "Sada Cruzeiro",
    imageUrl: pickImage("VOLLEYBALL", 0),
    minPriceCents: 2000,
    maxPriceCents: 8000,
    vibeChips: ["Final"],
  },
  {
    id: "event-8",
    title: "São Paulo FC vs Internacional",
    sport: "FOOTBALL",
    league: "Série A",
    venue: mockVenues[1],
    startsAt: "2026-05-17T18:30:00-03:00",
    status: "ON_SALE",
    serviceFeePercent: 10,
    homeTeam: "São Paulo FC",
    awayTeam: "Internacional",
    imageUrl: pickImage("FOOTBALL", 1),
    minPriceCents: 4500,
    maxPriceCents: 22000,
  },
];

function generateSeats(eventId: string): Seat[] {
  const sections = [
    { name: "Norte", rows: 6, cols: 12, basePrice: 4000 },
    { name: "Sul", rows: 6, cols: 12, basePrice: 4000 },
    { name: "Leste Premium", rows: 4, cols: 10, basePrice: 18000 },
    { name: "Oeste Premium", rows: 4, cols: 10, basePrice: 18000 },
    { name: "Cadeiras Superiores", rows: 5, cols: 14, basePrice: 6500 },
  ];

  const seats: Seat[] = [];
  const statusWeights: SeatStatus[] = [
    "AVAILABLE",
    "AVAILABLE",
    "AVAILABLE",
    "AVAILABLE",
    "AVAILABLE",
    "RESERVED",
    "SOLD",
    "SOLD",
    "BLOCKED",
  ];

  let seatCounter = 1;
  sections.forEach((section, sIdx) => {
    for (let r = 0; r < section.rows; r++) {
      for (let c = 0; c < section.cols; c++) {
        const roll = Math.floor(
          ((sIdx * 100 + r * 10 + c) * 7919) % statusWeights.length
        );
        seats.push({
          id: `seat-${eventId}-${seatCounter}`,
          eventId,
          section: section.name,
          row: String.fromCharCode(65 + r),
          number: String(c + 1),
          priceCents: section.basePrice,
          status: statusWeights[roll],
          col: c,
          rowIndex: r,
        });
        seatCounter++;
      }
    }
  });

  return seats;
}

export const mockSeats: Record<string, Seat[]> = Object.fromEntries(
  mockEvents.map((e) => [e.id, generateSeats(e.id)])
);

export const mockUser: User = {
  id: "user-1",
  name: "Rafael Souza",
  email: "rafael@exemplo.com.br",
  cpf: "***.***.***-**",
  phone: "(11) 98765-4321",
  createdAt: "2025-08-01T10:00:00-03:00",
};

export const mockTickets: Ticket[] = [
  {
    id: "ticket-1",
    orderId: "order-1",
    event: mockEvents[0],
    seat: mockSeats["event-1"][5],
    qrCode: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=CATRACA-TK-001",
    status: "VALID",
    purchasedAt: "2026-03-20T14:30:00-03:00",
  },
  {
    id: "ticket-2",
    orderId: "order-1",
    event: mockEvents[0],
    seat: mockSeats["event-1"][6],
    qrCode: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=CATRACA-TK-002",
    status: "VALID",
    purchasedAt: "2026-03-20T14:30:00-03:00",
  },
  {
    id: "ticket-3",
    orderId: "order-2",
    event: mockEvents[3],
    seat: mockSeats["event-4"][10],
    qrCode: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=CATRACA-TK-003",
    status: "USED",
    purchasedAt: "2026-02-15T09:00:00-03:00",
  },
];

export const mockOrders: Order[] = [
  {
    id: "order-1",
    userId: "user-1",
    reservationIds: ["res-1", "res-2"],
    totalCents: 5700,
    stripePaymentId: "pi_mock_001",
    status: "PAID",
    createdAt: "2026-03-20T14:30:00-03:00",
    event: mockEvents[0],
    seats: [mockSeats["event-1"][5], mockSeats["event-1"][6]],
  },
  {
    id: "order-2",
    userId: "user-1",
    reservationIds: ["res-3"],
    totalCents: 3240,
    stripePaymentId: "pi_mock_002",
    status: "PAID",
    createdAt: "2026-02-15T09:00:00-03:00",
    event: mockEvents[3],
    seats: [mockSeats["event-4"][10]],
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

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
