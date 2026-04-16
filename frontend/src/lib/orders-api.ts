import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api";
import { useAuthStore } from "@/store/auth";
import type { Order } from "./mock-data";

export interface CreateOrderRequest {
  orgSlug: string;
  reservationIds: string[];
}

// List orders for the authenticated user — backend: GET /me/orders
async function fetchOrders(): Promise<Order[]> {
  const token = useAuthStore.getState().accessToken;
  return apiFetch<Order[]>("/me/orders", { accessToken: token });
}

// Get a single order — backend: GET /me/orders/{id}
async function fetchOrder(id: string): Promise<Order> {
  const token = useAuthStore.getState().accessToken;
  return apiFetch<Order>(`/me/orders/${id}`, { accessToken: token });
}

async function createOrder(data: CreateOrderRequest): Promise<CreateOrderResponse> {
  const token = useAuthStore.getState().accessToken;
  return apiFetch<CreateOrderResponse>("/orders", {
    method: "POST",
    body: JSON.stringify(data),
    accessToken: token,
  });
}

/** Response from POST /orders — payment continues via Stripe Checkout redirect or dev simulation. */
export interface CreateOrderResponse {
  orderId: string;
  totalCents: number;
  stripeEnabled: boolean;
}

export interface CreateCheckoutSessionResponse {
  url: string;
}

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: fetchOrders,
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ["order", id],
    queryFn: () => fetchOrder(id),
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });
}
