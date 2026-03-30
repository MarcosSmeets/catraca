import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./api";
import { useAuthStore } from "@/store/auth";
import { mockTickets, type Ticket } from "./mock-data";

async function fetchTickets(): Promise<Ticket[]> {
  const token = useAuthStore.getState().accessToken;
  return apiFetch<Ticket[]>("/tickets", { accessToken: token });
}

async function fetchTicket(id: string): Promise<Ticket> {
  const token = useAuthStore.getState().accessToken;
  return apiFetch<Ticket>(`/tickets/${id}`, { accessToken: token });
}

export function useTickets() {
  return useQuery({
    queryKey: ["tickets"],
    queryFn: fetchTickets,
    placeholderData: mockTickets,
  });
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: ["ticket", id],
    queryFn: () => fetchTicket(id),
    placeholderData: mockTickets.find((t) => t.id === id),
    enabled: !!id,
  });
}
