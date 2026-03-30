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
  reservedAt: number | null;
  addSeats: (seats: Seat[], event: Event) => void;
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
      reservedAt: null,

      addSeats: (seats, event) =>
        set({
          items: seats.map((seat) => ({ seat, eventId: event.id })),
          event,
          reservedAt: Date.now(),
        }),

      removeSeat: (seatId) =>
        set((state) => ({
          items: state.items.filter((item) => item.seat.id !== seatId),
        })),

      clearCart: () => set({ items: [], event: null, reservedAt: null }),

      isExpired: () => {
        const { reservedAt } = get();
        if (!reservedAt) return false;
        return Date.now() - reservedAt > RESERVATION_MS;
      },

      secondsRemaining: () => {
        const { reservedAt } = get();
        if (!reservedAt) return 0;
        const elapsed = Date.now() - reservedAt;
        const remaining = RESERVATION_MS - elapsed;
        return Math.max(0, Math.floor(remaining / 1000));
      },
    }),
    {
      name: "catraca-cart",
    }
  )
);
