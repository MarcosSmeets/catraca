import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./api";
import { useAuthStore } from "@/store/auth";
import type { Event, Seat, SportType } from "./mock-data";
import { DEFAULT_PUBLIC_ORG_SLUG } from "./default-org-slug";

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

function orgEventsPath(orgSlug: string) {
  return `/orgs/${encodeURIComponent(orgSlug)}/events`;
}

async function fetchEventsForOrg(
  orgSlug: string,
  params: SearchEventsParams
): Promise<PaginatedEvents> {
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

  return apiFetch<PaginatedEvents>(`${orgEventsPath(orgSlug)}?${qs.toString()}`, {
    accessToken: token,
  });
}

async function fetchEventForOrg(orgSlug: string, id: string): Promise<Event> {
  const token = useAuthStore.getState().accessToken;
  return apiFetch<Event>(`${orgEventsPath(orgSlug)}/${encodeURIComponent(id)}`, {
    accessToken: token,
  });
}

async function fetchEventSeatsForOrg(
  orgSlug: string,
  eventId: string
): Promise<Seat[]> {
  const token = useAuthStore.getState().accessToken;
  return apiFetch<Seat[]>(
    `${orgEventsPath(orgSlug)}/${encodeURIComponent(eventId)}/seats`,
    { accessToken: token }
  );
}

export function useEvents(orgSlug: string, params: SearchEventsParams = {}) {
  return useQuery({
    queryKey: ["events", orgSlug, params],
    queryFn: () => fetchEventsForOrg(orgSlug, params),
    enabled: !!orgSlug,
  });
}

/** Home / search default tenant catalog. */
export function useDefaultOrgEvents(params: SearchEventsParams = {}) {
  return useEvents(DEFAULT_PUBLIC_ORG_SLUG, params);
}

export function useEvent(orgSlug: string, id: string) {
  return useQuery({
    queryKey: ["event", orgSlug, id],
    queryFn: () => fetchEventForOrg(orgSlug, id),
    enabled: !!id && !!orgSlug,
  });
}

export function useEventSeats(orgSlug: string, eventId: string) {
  return useQuery({
    queryKey: ["event-seats", orgSlug, eventId],
    queryFn: () => fetchEventSeatsForOrg(orgSlug, eventId),
    enabled: !!eventId && !!orgSlug,
    refetchInterval: 15_000,
  });
}
