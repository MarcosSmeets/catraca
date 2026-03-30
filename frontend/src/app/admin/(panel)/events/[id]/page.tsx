"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminListEvents, adminPublishEvent, adminListSections } from "@/lib/admin-api";
import { Button } from "@/components/ui";
import type { EventStatus } from "@/lib/mock-data";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import type { Seat } from "@/lib/mock-data";

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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs font-display font-semibold uppercase tracking-tight text-on-surface/40">
        {label}
      </p>
      <p className="text-sm font-body text-on-surface">{value}</p>
    </div>
  );
}

export default function AdminEventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const token = useAuthStore((s) => s.accessToken);

  const { data: events, isLoading } = useQuery({
    queryKey: ["admin-events"],
    queryFn: adminListEvents,
  });

  const { data: sections } = useQuery({
    queryKey: ["admin-sections", id],
    queryFn: () => adminListSections(id),
    enabled: !!id,
  });

  const { data: seats } = useQuery({
    queryKey: ["event-seats", id],
    queryFn: () => apiFetch<Seat[]>(`/events/${id}/seats`, { accessToken: token }),
    enabled: !!id,
  });

  const publishMutation = useMutation({
    mutationFn: adminPublishEvent,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-events"] });
    },
  });

  const event = events?.find((e) => e.id === id);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 bg-surface-low rounded-sm animate-pulse" />
        ))}
      </div>
    );
  }

  if (!event) {
    return (
      <p className="text-sm font-body text-error bg-error/5 px-4 py-3 rounded-sm">
        Evento não encontrado.
      </p>
    );
  }

  const status = event.status as EventStatus;

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Link
              href="/admin/events"
              className="text-xs font-body text-on-surface/40 hover:text-on-surface transition-colors"
            >
              ← Eventos
            </Link>
          </div>
          <h1 className="font-display font-black text-3xl text-on-surface tracking-tight">
            {event.homeTeam} × {event.awayTeam}
          </h1>
          <p className="text-on-surface/50 font-body text-sm">{event.title}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span
            className={[
              "inline-flex px-3 py-1 rounded-full text-xs font-display font-semibold",
              STATUS_COLORS[status],
            ].join(" ")}
          >
            {STATUS_LABELS[status]}
          </span>
          {status === "DRAFT" && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => publishMutation.mutate(id)}
              disabled={publishMutation.isPending}
            >
              {publishMutation.isPending ? "Publicando..." : "Publicar Evento"}
            </Button>
          )}
        </div>
      </div>

      {/* Info grid */}
      <div className="bg-surface-low border border-outline-variant rounded-sm p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
        <InfoRow label="Esporte" value={event.sport} />
        <InfoRow label="Liga" value={event.league} />
        <InfoRow label="Data" value={formatDate(event.startsAt)} />
        <InfoRow label="Estádio" value={event.venue?.name ?? "—"} />
        <InfoRow
          label="Preço mínimo"
          value={
            event.minPriceCents
              ? `R$ ${(event.minPriceCents / 100).toFixed(2)}`
              : "—"
          }
        />
        <InfoRow
          label="Preço máximo"
          value={
            event.maxPriceCents
              ? `R$ ${(event.maxPriceCents / 100).toFixed(2)}`
              : "—"
          }
        />
        <InfoRow label="Taxa de serviço" value={`${event.serviceFeePercent}%`} />
        <InfoRow label="Assentos" value={String(seats?.length ?? "—")} />
      </div>

      {/* Sections */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-black text-xl text-on-surface tracking-tight">
            Seções
          </h2>
          <Link href={`/admin/events/${id}/sections/new`}>
            <Button variant="secondary" size="sm">
              + Nova Seção
            </Button>
          </Link>
        </div>

        {!sections || sections.length === 0 ? (
          <p className="text-sm font-body text-on-surface/40 py-4 text-center">
            Nenhuma seção cadastrada.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {sections.map((section) => (
              <div
                key={section.id}
                className="border border-outline-variant rounded-sm overflow-hidden bg-surface-low"
              >
                {section.imageUrl ? (
                  <div
                    className="h-24 bg-surface-high bg-cover bg-center"
                    style={{ backgroundImage: `url(${section.imageUrl})` }}
                  />
                ) : (
                  <div className="h-24 bg-surface-high flex items-center justify-center">
                    <span className="text-on-surface/20 text-xs font-body">Sem foto</span>
                  </div>
                )}
                <div className="px-3 py-2">
                  <p className="font-display font-semibold text-sm text-on-surface">
                    {section.name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Seats */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-black text-xl text-on-surface tracking-tight">
            Assentos{" "}
            <span className="font-body font-normal text-on-surface/40 text-base">
              ({seats?.length ?? 0})
            </span>
          </h2>
          <Link href={`/admin/events/${id}/seats/new`}>
            <Button variant="secondary" size="sm">
              + Adicionar Assentos
            </Button>
          </Link>
        </div>

        {!seats || seats.length === 0 ? (
          <p className="text-sm font-body text-on-surface/40 py-4 text-center">
            Nenhum assento cadastrado.
          </p>
        ) : (
          <div className="border border-outline-variant rounded-sm overflow-hidden">
            <table className="w-full text-sm font-body">
              <thead className="bg-surface-low border-b border-outline-variant">
                <tr>
                  <th className="text-left px-4 py-2.5 font-display font-semibold text-xs uppercase tracking-tight text-on-surface/50">
                    Seção
                  </th>
                  <th className="text-left px-4 py-2.5 font-display font-semibold text-xs uppercase tracking-tight text-on-surface/50">
                    Fileira
                  </th>
                  <th className="text-left px-4 py-2.5 font-display font-semibold text-xs uppercase tracking-tight text-on-surface/50">
                    Número
                  </th>
                  <th className="text-right px-4 py-2.5 font-display font-semibold text-xs uppercase tracking-tight text-on-surface/50">
                    Preço
                  </th>
                  <th className="text-right px-4 py-2.5 font-display font-semibold text-xs uppercase tracking-tight text-on-surface/50">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {seats.slice(0, 50).map((seat, idx) => (
                  <tr
                    key={seat.id}
                    className={[
                      "hover:bg-surface-low transition-colors duration-100",
                      idx !== Math.min(seats.length, 50) - 1
                        ? "border-b border-outline-variant"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <td className="px-4 py-2.5 text-on-surface">{seat.section}</td>
                    <td className="px-4 py-2.5 text-on-surface/60">{seat.row}</td>
                    <td className="px-4 py-2.5 text-on-surface/60">{seat.number}</td>
                    <td className="px-4 py-2.5 text-right text-on-surface/60">
                      R$ {(seat.priceCents / 100).toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="text-xs font-display font-semibold text-on-surface/50">
                        {seat.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {seats.length > 50 && (
              <p className="text-xs text-center font-body text-on-surface/30 py-3 border-t border-outline-variant">
                Exibindo 50 de {seats.length} assentos
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
