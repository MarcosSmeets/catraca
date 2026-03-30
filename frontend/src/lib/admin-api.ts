import { apiFetch } from "./api";
import { useAdminAuthStore } from "@/store/admin-auth";
import type { Venue, Event, Seat } from "./mock-data";

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
export async function adminListVenues(): Promise<Venue[]> {
  const res = await apiFetch<{ venues: Venue[] }>("/admin/venues", { accessToken: token() });
  return res.venues;
}

export async function adminCreateVenue(payload: CreateVenuePayload): Promise<Venue> {
  return apiFetch<Venue>("/admin/venues", {
    method: "POST",
    body: JSON.stringify(payload),
    accessToken: token(),
  });
}

// Events
export async function adminListEvents(): Promise<Event[]> {
  const res = await apiFetch<{ events: Event[] }>("/admin/events", { accessToken: token() });
  return res.events;
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
