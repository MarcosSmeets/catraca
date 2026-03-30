import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./api";
import { useAuthStore } from "@/store/auth";
import type { Event, Seat, SportType } from "./mock-data";

export interface SearchEventsParams {
  q?: string;
  sport?: SportType | "";
  league?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  dateFrom?: string;
  dateTo?: string;
  sort?: "date" | "price-asc" | "price-desc";
  page?: number;
  limit?: number;
}

export interface PaginatedEvents {
  events: Event[];
  total: number;
  page: number;
  limit: number;
}

async function fetchEvents(params: SearchEventsParams): Promise<PaginatedEvents> {
  const token = useAuthStore.getState().accessToken;
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.sport) qs.set("sport", params.sport);
  if (params.league) qs.set("league", params.league);
  if (params.city) qs.set("city", params.city);
  if (params.minPrice) qs.set("min_price", String(params.minPrice));
  if (params.maxPrice) qs.set("max_price", String(params.maxPrice));
  if (params.dateFrom) qs.set("date_from", params.dateFrom);
  if (params.dateTo) qs.set("date_to", params.dateTo);
  if (params.sort) qs.set("sort", params.sort);
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));

  return apiFetch<PaginatedEvents>(`/events?${qs.toString()}`, { accessToken: token });
}

async function fetchEvent(id: string): Promise<Event> {
  const token = useAuthStore.getState().accessToken;
  return apiFetch<Event>(`/events/${id}`, { accessToken: token });
}

async function fetchEventSeats(eventId: string): Promise<Seat[]> {
  const token = useAuthStore.getState().accessToken;
  return apiFetch<Seat[]>(`/events/${eventId}/seats`, { accessToken: token });
}

export function useEvents(params: SearchEventsParams = {}) {
  return useQuery({
    queryKey: ["events", params],
    queryFn: () => fetchEvents(params),
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: ["event", id],
    queryFn: () => fetchEvent(id),
    enabled: !!id,
  });
}

export function useEventSeats(eventId: string) {
  return useQuery({
    queryKey: ["event-seats", eventId],
    queryFn: () => fetchEventSeats(eventId),
    enabled: !!eventId,
    refetchInterval: 15_000,
  });
}
