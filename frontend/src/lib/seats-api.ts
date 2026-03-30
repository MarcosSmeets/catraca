import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api";
import { useAuthStore } from "@/store/auth";
import type { Reservation } from "./mock-data";

export interface LockSeatRequest {
  eventId: string;
  seatId: string;
}

export interface LockSeatResponse {
  reservation: Reservation;
}

export interface UnlockSeatRequest {
  reservationId: string;
}

async function lockSeat(data: LockSeatRequest): Promise<LockSeatResponse> {
  const token = useAuthStore.getState().accessToken;
  return apiFetch<LockSeatResponse>("/reservations", {
    method: "POST",
    body: JSON.stringify(data),
    accessToken: token,
  });
}

async function unlockSeat(data: UnlockSeatRequest): Promise<void> {
  const token = useAuthStore.getState().accessToken;
  return apiFetch<void>(`/reservations/${data.reservationId}`, {
    method: "DELETE",
    accessToken: token,
  });
}

export function useLockSeat(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: lockSeat,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-seats", eventId] });
    },
  });
}

export function useUnlockSeat(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: unlockSeat,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-seats", eventId] });
    },
  });
}
