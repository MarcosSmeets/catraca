import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Seat, Event } from "@/lib/mock-data";

export interface CartItem {
  seat: Seat;
  eventId: string;
}

interface CartState {
  items: CartItem[];
  event: Event | null;
  /** Organization slug for tenant-scoped reservation / checkout APIs */
  organizationSlug: string | null;
  reservedAt: number | null;
  /** ISO string from server — precise expiry set by the reservation API */
  serverExpiresAt: string | null;
  /** Reservation IDs returned by POST /reservations */
  reservationIds: string[];
  addSeats: (seats: Seat[], event: Event, organizationSlug: string) => void;
  setReservation: (reservationIds: string[], expiresAt: string) => void;
  removeSeat: (seatId: string) => void;
  clearCart: () => void;
  isExpired: () => boolean;
  secondsRemaining: () => number;
}

const RESERVATION_MS = 10 * 60 * 1000;

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      event: null,
      organizationSlug: null,
      reservedAt: null,
      serverExpiresAt: null,
      reservationIds: [],

      addSeats: (seats, event, organizationSlug) =>
        set({
          items: seats.map((seat) => ({ seat, eventId: event.id })),
          event,
          organizationSlug,
          reservedAt: Date.now(),
          serverExpiresAt: null,
          reservationIds: [],
        }),

      setReservation: (reservationIds, expiresAt) =>
        set({
          reservationIds,
          serverExpiresAt: expiresAt,
          reservedAt: new Date(expiresAt).getTime() - RESERVATION_MS,
        }),

      removeSeat: (seatId) =>
        set((state) => ({
          items: state.items.filter((item) => item.seat.id !== seatId),
        })),

      clearCart: () =>
        set({
          items: [],
          event: null,
          organizationSlug: null,
          reservedAt: null,
          serverExpiresAt: null,
          reservationIds: [],
        }),

      isExpired: () => {
        const { serverExpiresAt, reservedAt } = get();
        const expiry = serverExpiresAt
          ? new Date(serverExpiresAt).getTime()
          : (reservedAt ?? 0) + RESERVATION_MS;
        return Date.now() > expiry;
      },

      secondsRemaining: () => {
        const { serverExpiresAt, reservedAt } = get();
        const expiry = serverExpiresAt
          ? new Date(serverExpiresAt).getTime()
          : (reservedAt ?? 0) + RESERVATION_MS;
        const remaining = expiry - Date.now();
        return Math.max(0, Math.floor(remaining / 1000));
      },
    }),
    {
      name: "catraca-cart-v2",
    }
  )
);
