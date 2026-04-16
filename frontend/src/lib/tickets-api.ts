import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./api";
import { useAuthStore } from "@/store/auth";
import type { Ticket } from "./mock-data";

// List tickets for authenticated user — backend: GET /me/tickets
async function fetchTickets(): Promise<Ticket[]> {
  const token = useAuthStore.getState().accessToken;
  return apiFetch<Ticket[]>("/me/tickets", { accessToken: token });
}

// Get a single ticket — backend: GET /me/tickets/{id}
async function fetchTicket(id: string): Promise<Ticket> {
  const token = useAuthStore.getState().accessToken;
  return apiFetch<Ticket>(`/me/tickets/${id}`, { accessToken: token });
}

export function useTickets() {
  return useQuery({
    queryKey: ["tickets"],
    queryFn: fetchTickets,
  });
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: ["ticket", id],
    queryFn: () => fetchTicket(id),
    enabled: !!id,
  });
}
