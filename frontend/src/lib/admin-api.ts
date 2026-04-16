import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./api";
import { useAdminAuthStore } from "@/store/admin-auth";
import type { Venue, Event, Seat, EventStatus } from "./mock-data";

export interface AdminSection {
  id: string;
  eventId: string;
  name: string;
  imageUrl: string;
}

export interface CreateVenuePayload {
  name: string;
  city: string;
  state: string;
  capacity: number;
}

export interface CreateEventPayload {
  title: string;
  sport: string;
  league: string;
  venueId: string;
  startsAt: string;
  homeTeam: string;
  awayTeam: string;
  imageUrl: string;
  serviceFeePercent: number;
  vibeChips: string[];
}

export interface UpdateEventPayload {
  title?: string;
  homeTeam?: string;
  awayTeam?: string;
  imageUrl?: string;
  vibeChips?: string[];
}

export interface CreateSectionPayload {
  name: string;
  imageUrl: string;
}

export interface SeatInput {
  section: string;
  row: string;
  number: string;
  priceCents: number;
  col: number;
  rowIndex: number;
}

function token() {
  return useAdminAuthStore.getState().adminToken;
}

// Venues
export interface AdminVenuesParams {
  q?: string;
  state?: string;
  city?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedAdminVenues {
  venues: Venue[];
  total: number;
  page: number;
  limit: number;
}

export async function adminListVenues(
  params: AdminVenuesParams = {}
): Promise<PaginatedAdminVenues> {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.state) qs.set("state", params.state);
  if (params.city) qs.set("city", params.city);
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  const query = qs.toString();
  return apiFetch<PaginatedAdminVenues>(`/admin/venues${query ? `?${query}` : ""}`, {
    accessToken: token(),
  });
}

export async function adminListVenueStates(): Promise<string[]> {
  const res = await apiFetch<{ states: string[] }>("/admin/venues/states", {
    accessToken: token(),
  });
  return res.states;
}

export function useAdminVenues(params: AdminVenuesParams = {}) {
  return useQuery({
    queryKey: ["admin-venues", params],
    queryFn: () => adminListVenues(params),
  });
}

export function useAdminVenueStates() {
  return useQuery({
    queryKey: ["admin-venue-states"],
    queryFn: adminListVenueStates,
  });
}

export async function adminCreateVenue(payload: CreateVenuePayload): Promise<Venue> {
  return apiFetch<Venue>("/admin/venues", {
    method: "POST",
    body: JSON.stringify(payload),
    accessToken: token(),
  });
}

// Events
export interface AdminEventsParams {
  q?: string;
  status?: EventStatus | "";
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedAdminEvents {
  events: Event[];
  total: number;
  page: number;
  limit: number;
}

export async function adminListEvents(
  params: AdminEventsParams = {}
): Promise<PaginatedAdminEvents> {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.status) qs.set("status", params.status);
  if (params.dateFrom) qs.set("date_from", params.dateFrom);
  if (params.dateTo) qs.set("date_to", params.dateTo);
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  const query = qs.toString();
  return apiFetch<PaginatedAdminEvents>(`/admin/events${query ? `?${query}` : ""}`, {
    accessToken: token(),
  });
}

export function useAdminEvents(params: AdminEventsParams = {}) {
  return useQuery({
    queryKey: ["admin-events", params],
    queryFn: () => adminListEvents(params),
  });
}

export async function adminCreateEvent(payload: CreateEventPayload): Promise<Event> {
  return apiFetch<Event>("/admin/events", {
    method: "POST",
    body: JSON.stringify(payload),
    accessToken: token(),
  });
}

export async function adminUpdateEvent(id: string, payload: UpdateEventPayload): Promise<Event> {
  return apiFetch<Event>(`/admin/events/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    accessToken: token(),
  });
}

export async function adminPublishEvent(id: string): Promise<Event> {
  return apiFetch<Event>(`/admin/events/${id}/publish`, {
    method: "POST",
    accessToken: token(),
  });
}

// Sections
export async function adminListSections(eventId: string): Promise<AdminSection[]> {
  const res = await apiFetch<{ sections: AdminSection[] }>(`/admin/events/${eventId}/sections`, {
    accessToken: token(),
  });
  return res.sections;
}

export async function adminCreateSection(
  eventId: string,
  payload: CreateSectionPayload
): Promise<AdminSection> {
  return apiFetch<AdminSection>(`/admin/events/${eventId}/sections`, {
    method: "POST",
    body: JSON.stringify(payload),
    accessToken: token(),
  });
}

// Seats
export async function adminBatchCreateSeats(
  eventId: string,
  seats: SeatInput[]
): Promise<Seat[]> {
  const res = await apiFetch<{ seats: Seat[] }>(`/admin/events/${eventId}/seats/batch`, {
    method: "POST",
    body: JSON.stringify({ seats }),
    accessToken: token(),
  });
  return res.seats;
}

// Ticket scan
export interface ScanTicketResult {
  id: string;
  qrCode: string;
  status: "VALID" | "USED" | "CANCELLED";
  usedAt?: string;
  purchasedAt: string;
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

export interface ScanTicketConflict {
  error: string;
  ticket: ScanTicketResult;
}

export async function adminScanTicket(qrCode: string): Promise<ScanTicketResult> {
  return apiFetch<ScanTicketResult>("/admin/tickets/scan", {
    method: "POST",
    body: JSON.stringify({ qr_code: qrCode }),
    accessToken: token(),
  });
}

// ─── Dashboard Metrics ────────────────────────────────────────────────────────

export interface DashboardFinancial {
  revenueAllCents: number;
  revenue30dCents: number;
  paidOrdersAll: number;
  paidOrders30d: number;
  ticketsAll: number;
  tickets30d: number;
  avgTicketAllCents: number;
  avgTicket30dCents: number;
  serviceFeesAllCents: number;
  serviceFees30dCents: number;
}

export interface DailyRevenuePoint {
  day: string;
  revenueCents: number;
  ordersCount: number;
}

export interface SectionCount {
  section: string;
  ticketsCount: number;
}

export interface SportCount {
  sport: string;
  ticketsCount: number;
}

export interface TopEventMetric {
  eventId: string;
  title: string;
  homeTeam: string;
  awayTeam: string;
  venueName: string;
  ticketsSold: number;
  revenueCents: number;
}

export interface TicketStatusCount {
  status: "VALID" | "USED" | "CANCELLED";
  count: number;
}

export interface StadiumMetric {
  id: string;
  name: string;
  city: string;
  state: string;
  capacity: number;
  eventCount: number;
  totalSeats: number;
  ticketsSold: number;
  revenueCents: number;
  occupancy: number;
}

export interface OrderStatusMetric {
  status: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  countAll: number;
  count30d: number;
  amountAllCents: number;
  amount30dCents: number;
}

export interface DashboardMetrics {
  financial: DashboardFinancial;
  dailyRevenue: DailyRevenuePoint[];
  ticketSections: SectionCount[];
  ticketSports: SportCount[];
  topEvents: TopEventMetric[];
  ticketStatuses: TicketStatusCount[];
  stadiums: StadiumMetric[];
  orderStatuses: OrderStatusMetric[];
}

export async function adminGetMetrics(): Promise<DashboardMetrics> {
  return apiFetch<DashboardMetrics>("/admin/metrics", { accessToken: token() });
}

export function useAdminMetrics() {
  return useQuery({
    queryKey: ["admin-metrics"],
    queryFn: adminGetMetrics,
  });
}
