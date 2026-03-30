import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "./api";
import { useAuthStore } from "@/store/auth";

export interface CreatePaymentIntentRequest {
  reservationIds: string[];
  method: "card" | "pix";
}

export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  pixQrCode?: string;
  pixKey?: string;
}

export interface ConfirmPaymentRequest {
  paymentIntentId: string;
}

export interface ConfirmPaymentResponse {
  status: "succeeded" | "requires_action" | "processing";
  orderId?: string;
}

async function createPaymentIntent(
  data: CreatePaymentIntentRequest
): Promise<PaymentIntentResponse> {
  const token = useAuthStore.getState().accessToken;
  return apiFetch<PaymentIntentResponse>("/payments/intent", {
    method: "POST",
    body: JSON.stringify(data),
    accessToken: token,
  });
}

async function confirmPayment(
  data: ConfirmPaymentRequest
): Promise<ConfirmPaymentResponse> {
  const token = useAuthStore.getState().accessToken;
  return apiFetch<ConfirmPaymentResponse>("/payments/confirm", {
    method: "POST",
    body: JSON.stringify(data),
    accessToken: token,
  });
}

export function useCreatePaymentIntent() {
  return useMutation({
    mutationFn: createPaymentIntent,
  });
}

export function useConfirmPayment() {
  return useMutation({
    mutationFn: confirmPayment,
  });
}
