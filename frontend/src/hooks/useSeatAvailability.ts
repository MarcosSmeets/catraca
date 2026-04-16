import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Seat, SeatStatus } from "@/lib/mock-data";
import { PUBLIC_API_BASE_URL } from "@/lib/public-api-base";

interface SeatUpdateMessage {
  type: "seat_update";
  eventId: string;
  seatId: string;
  status: SeatStatus;
}

interface ConnectionMessage {
  type: "connected";
  eventId: string;
}

type SseMessage = SeatUpdateMessage | ConnectionMessage;

/**
 * Subscribes to real-time seat availability updates for a given event via SSE.
 * When a seat status changes on the server, the query cache for that event's
 * seats is updated optimistically without a full refetch.
 */
export function useSeatAvailability(orgSlug: string, eventId: string) {
  const queryClient = useQueryClient();
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventIdRef = useRef(eventId);
  const orgSlugRef = useRef(orgSlug);

  useEffect(() => {
    eventIdRef.current = eventId;
    orgSlugRef.current = orgSlug;
  }, [eventId, orgSlug]);

  useEffect(() => {
    if (!eventId || !orgSlug) return;

    function connect() {
      if (esRef.current) {
        esRef.current.close();
      }

      const url = `${PUBLIC_API_BASE_URL}/orgs/${encodeURIComponent(orgSlugRef.current)}/events/${eventIdRef.current}/seats/stream`;
      const es = new EventSource(url, { withCredentials: true });
      esRef.current = es;

      es.addEventListener("message", (event) => {
        try {
          const data: SseMessage = JSON.parse(event.data);

          if (data.type === "seat_update") {
            queryClient.setQueryData<Seat[]>(
              ["event-seats", orgSlugRef.current, eventIdRef.current],
              (prev) => {
                if (!prev) return prev;
                return prev.map((seat) =>
                  seat.id === data.seatId ? { ...seat, status: data.status } : seat
                );
              }
            );
          }
        } catch {
          // silently ignore malformed messages
        }
      });

      es.addEventListener("error", () => {
        es.close();
        esRef.current = null;
        reconnectTimeoutRef.current = setTimeout(connect, 5000);
      });
    }

    connect();

    return () => {
      esRef.current?.close();
      esRef.current = null;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [eventId, orgSlug, queryClient]);
}
