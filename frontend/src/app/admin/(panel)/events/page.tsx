"use client";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminListEvents, adminPublishEvent } from "@/lib/admin-api";
import { Button } from "@/components/ui";
import type { EventStatus } from "@/lib/mock-data";

const STATUS_LABELS: Record<EventStatus, string> = {
  DRAFT: "Rascunho",
  ON_SALE: "À Venda",
  SOLD_OUT: "Esgotado",
  CANCELLED: "Cancelado",
};

const STATUS_COLORS: Record<EventStatus, string> = {
  DRAFT: "bg-surface-high text-on-surface/60",
  ON_SALE: "bg-primary/10 text-primary",
  SOLD_OUT: "bg-error/10 text-error",
  CANCELLED: "bg-surface-dim text-on-surface/40",
};

export default function AdminEventsPage() {
  const qc = useQueryClient();
  const { data: events, isLoading, isError } = useQuery({
    queryKey: ["admin-events"],
    queryFn: adminListEvents,
  });

  const publishMutation = useMutation({
    mutationFn: adminPublishEvent,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-events"] }),
  });

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-black text-3xl text-on-surface tracking-tight">
            Eventos
          </h1>
          <p className="text-on-surface/50 font-body text-sm mt-1">
            Gerenciar eventos, seções e assentos.
          </p>
        </div>
        <Link href="/admin/events/new">
          <Button variant="primary" size="md">
            + Novo Evento
          </Button>
        </Link>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-surface-low rounded-sm animate-pulse" />
          ))}
        </div>
      )}

      {isError && (
        <p className="text-sm font-body text-error bg-error/5 px-4 py-3 rounded-sm">
          Falha ao carregar eventos.
        </p>
      )}

      {!isLoading && !isError && events && events.length === 0 && (
        <div className="text-center py-16 text-on-surface/40 font-body text-sm">
          Nenhum evento cadastrado.{" "}
          <Link href="/admin/events/new" className="text-primary hover:underline">
            Criar agora
          </Link>
          .
        </div>
      )}

      {!isLoading && events && events.length > 0 && (
        <div className="border border-outline-variant rounded-sm overflow-hidden">
          <table className="w-full text-sm font-body">
            <thead className="bg-surface-low border-b border-outline-variant">
              <tr>
                <th className="text-left px-4 py-3 font-display font-semibold text-xs uppercase tracking-tight text-on-surface/50">
                  Evento
                </th>
                <th className="text-left px-4 py-3 font-display font-semibold text-xs uppercase tracking-tight text-on-surface/50 hidden md:table-cell">
                  Data
                </th>
                <th className="text-left px-4 py-3 font-display font-semibold text-xs uppercase tracking-tight text-on-surface/50">
                  Status
                </th>
                <th className="text-right px-4 py-3 font-display font-semibold text-xs uppercase tracking-tight text-on-surface/50">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {events.map((event, idx) => (
                <tr
                  key={event.id}
                  className={[
                    "transition-colors duration-100 hover:bg-surface-low",
                    idx !== events.length - 1 ? "border-b border-outline-variant" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <td className="px-4 py-3">
                    <p className="font-display font-semibold text-on-surface">
                      {event.homeTeam} × {event.awayTeam}
                    </p>
                    <p className="text-xs text-on-surface/40 mt-0.5">{event.title}</p>
                  </td>
                  <td className="px-4 py-3 text-on-surface/60 hidden md:table-cell">
                    {formatDate(event.startsAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={[
                        "inline-flex px-2 py-0.5 rounded-full text-xs font-display font-semibold",
                        STATUS_COLORS[event.status as EventStatus],
                      ].join(" ")}
                    >
                      {STATUS_LABELS[event.status as EventStatus]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {event.status === "DRAFT" && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => publishMutation.mutate(event.id)}
                          disabled={publishMutation.isPending}
                        >
                          Publicar
                        </Button>
                      )}
                      <Link href={`/admin/events/${event.id}`}>
                        <Button variant="secondary" size="sm">
                          Gerenciar
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
