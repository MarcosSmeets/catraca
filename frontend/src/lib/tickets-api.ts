import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api";
import { useAuthStore } from "@/store/auth";
import type { Ticket } from "./mock-data";

export type ValidateTicketResponse = {
  id: string;
  qrCode: string;
  status: string;
  usedAt?: string | null;
  purchasedAt: string;
};

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

async function validateTicket(ticketId: string): Promise<ValidateTicketResponse> {
  const token = useAuthStore.getState().accessToken;
  return apiFetch<ValidateTicketResponse>(`/me/tickets/${ticketId}/validate`, {
    method: "POST",
    accessToken: token,
  });
}

export function useValidateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: validateTicket,
    onSuccess: (_data, ticketId) => {
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });
}
