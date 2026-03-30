import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api";
import { useAuthStore } from "@/store/auth";
import { mockOrders, type Order } from "./mock-data";

export interface CreateOrderRequest {
  reservationIds: string[];
  paymentIntentId: string;
}

async function fetchOrders(): Promise<Order[]> {
  const token = useAuthStore.getState().accessToken;
  return apiFetch<Order[]>("/orders", { accessToken: token });
}

async function fetchOrder(id: string): Promise<Order> {
  const token = useAuthStore.getState().accessToken;
  return apiFetch<Order>(`/orders/${id}`, { accessToken: token });
}

async function createOrder(data: CreateOrderRequest): Promise<Order> {
  const token = useAuthStore.getState().accessToken;
  return apiFetch<Order>("/orders", {
    method: "POST",
    body: JSON.stringify(data),
    accessToken: token,
  });
}

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: fetchOrders,
    placeholderData: mockOrders,
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ["order", id],
    queryFn: () => fetchOrder(id),
    placeholderData: mockOrders.find((o) => o.id === id),
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
