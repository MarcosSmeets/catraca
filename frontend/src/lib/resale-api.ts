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

export interface StripeConnectStatus {
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
  stripeConnectAccountId?: string;
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

export async function fetchResaleListingsByEvent(eventId: string): Promise<ResaleListing[]> {
  return apiFetch<ResaleListing[]>(`/events/${eventId}/resale-listings`, { accessToken: null });
}

export function useResaleListingsByEvent(eventId: string | undefined) {
  return useQuery({
    queryKey: ["resale-listings", "event", eventId],
    queryFn: () => fetchResaleListingsByEvent(eventId!),
    enabled: !!eventId,
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

export async function fetchStripeConnectStatus(): Promise<StripeConnectStatus> {
  const token = useAuthStore.getState().accessToken;
  return apiFetch<StripeConnectStatus>("/me/stripe/connect/status", { accessToken: token });
}

export function useStripeConnectStatus() {
  return useQuery({
    queryKey: ["stripe-connect-status"],
    queryFn: fetchStripeConnectStatus,
  });
}

export async function startStripeConnect(returnUrl: string, refreshUrl: string): Promise<{ url: string }> {
  const token = useAuthStore.getState().accessToken;
  return apiFetch<{ url: string }>("/me/stripe/connect/account", {
    method: "POST",
    accessToken: token,
    body: JSON.stringify({ returnUrl, refreshUrl }),
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

export async function createResaleCheckoutSession(
  listingId: string,
  buyer: ResaleBuyerPayload
): Promise<{ url: string }> {
  const token = useAuthStore.getState().accessToken;
  return apiFetch<{ url: string }>(`/resale-listings/${listingId}/checkout-session`, {
    method: "POST",
    accessToken: token,
    body: JSON.stringify(buyer),
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
