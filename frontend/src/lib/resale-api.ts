import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api";
import { useAuthStore } from "@/store/auth";

export interface ResaleListing {
  id: string;
  ticketId: string;
  priceCents: number;
  status: string;
  createdAt: string;
  section?: string;
  row?: string;
  number?: string;
}

export interface ResaleMarketplaceListing extends ResaleListing {
  organizationSlug: string;
  eventId: string;
  homeTeam: string;
  awayTeam: string;
  eventStartsAt: string;
}

export interface ResaleHoldResponse {
  holdId: string;
  expiresAt: string;
}

export interface ResaleBuyerPayload {
  buyerName: string;
  buyerEmail: string;
  buyerCpf: string;
  buyerPhone: string;
  buyerCep: string;
  buyerStreet: string;
  buyerNeighborhood: string;
  buyerCity: string;
  buyerState: string;
}

export async function fetchResaleListingsByEvent(
  orgSlug: string,
  eventId: string
): Promise<ResaleListing[]> {
  return apiFetch<ResaleListing[]>(
    `/orgs/${encodeURIComponent(orgSlug)}/events/${encodeURIComponent(eventId)}/resale-listings`,
    { accessToken: null }
  );
}

export function useResaleListingsByEvent(
  orgSlug: string | undefined,
  eventId: string | undefined
) {
  return useQuery({
    queryKey: ["resale-listings", "event", orgSlug, eventId],
    queryFn: () => fetchResaleListingsByEvent(orgSlug!, eventId!),
    enabled: !!eventId && !!orgSlug,
  });
}

export async function fetchMyResaleListings(): Promise<ResaleListing[]> {
  const token = useAuthStore.getState().accessToken;
  return apiFetch<ResaleListing[]>("/me/resale-listings", { accessToken: token });
}

export function useMyResaleListings() {
  return useQuery({
    queryKey: ["resale-listings", "mine"],
    queryFn: fetchMyResaleListings,
  });
}

export async function fetchResaleListingsMarketplace(): Promise<ResaleMarketplaceListing[]> {
  return apiFetch<ResaleMarketplaceListing[]>("/resale-listings", { accessToken: null });
}

export function useResaleListingsMarketplace() {
  return useQuery({
    queryKey: ["resale-listings", "marketplace"],
    queryFn: fetchResaleListingsMarketplace,
  });
}

export async function createResaleListing(ticketId: string, priceCents: number): Promise<ResaleListing> {
  const token = useAuthStore.getState().accessToken;
  return apiFetch<ResaleListing>(`/me/tickets/${ticketId}/resale-listings`, {
    method: "POST",
    accessToken: token,
    body: JSON.stringify({ priceCents }),
  });
}

export async function cancelResaleListing(listingId: string): Promise<void> {
  const token = useAuthStore.getState().accessToken;
  await apiFetch<void>(`/me/resale-listings/${listingId}`, {
    method: "DELETE",
    accessToken: token,
  });
}

export async function createResaleListingHold(listingId: string): Promise<ResaleHoldResponse> {
  const token = useAuthStore.getState().accessToken;
  return apiFetch<ResaleHoldResponse>(`/me/resale-listings/${encodeURIComponent(listingId)}/hold`, {
    method: "POST",
    accessToken: token,
  });
}

export async function releaseResaleListingHold(holdId: string): Promise<void> {
  const token = useAuthStore.getState().accessToken;
  await apiFetch<void>(`/me/resale-listings/holds/${encodeURIComponent(holdId)}`, {
    method: "DELETE",
    accessToken: token,
  });
}

export async function createResaleCheckoutSession(
  listingId: string,
  holdId: string,
  buyer: ResaleBuyerPayload
): Promise<{ url: string }> {
  const token = useAuthStore.getState().accessToken;
  return apiFetch<{ url: string }>(`/resale-listings/${listingId}/checkout-session`, {
    method: "POST",
    accessToken: token,
    body: JSON.stringify({ holdId, ...buyer }),
  });
}

export function useCreateResaleListingMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, priceCents }: { ticketId: string; priceCents: number }) =>
      createResaleListing(ticketId, priceCents),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["resale-listings"] });
      void qc.invalidateQueries({ queryKey: ["tickets"] });
    },
  });
}

export function useCancelResaleListingMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (listingId: string) => cancelResaleListing(listingId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["resale-listings"] });
      void qc.invalidateQueries({ queryKey: ["tickets"] });
    },
  });
}
