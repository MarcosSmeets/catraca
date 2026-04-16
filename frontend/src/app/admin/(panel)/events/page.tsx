"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminPublishEvent, useAdminEvents } from "@/lib/admin-api";
import { Button, FilterSelect, Pagination } from "@/components/ui";
import type { EventStatus } from "@/lib/mock-data";

const STATUS_LABELS: Record<EventStatus, string> = {
  DRAFT: "Rascunho",
  ON_SALE: "À Venda",
  SOLD_OUT: "Esgotado",
  CANCELLED: "Cancelado",
  EXPIRED: "Expirado",
};

const STATUS_COLORS: Record<EventStatus, string> = {
  DRAFT: "bg-surface-high text-on-surface/60",
  ON_SALE: "bg-accent/10 text-accent",
  SOLD_OUT: "bg-error/10 text-error",
  CANCELLED: "bg-surface-dim text-on-surface/40",
  EXPIRED: "bg-on-surface/5 text-on-surface/50",
};

const STATUS_OPTIONS = [
  { value: "", label: "Todos os status" },
  { value: "DRAFT", label: "Rascunho" },
  { value: "ON_SALE", label: "À Venda" },
  { value: "SOLD_OUT", label: "Esgotado" },
  { value: "CANCELLED", label: "Cancelado" },
  { value: "EXPIRED", label: "Expirado" },
];

const PAGE_SIZE = 10;

export default function AdminEventsPage() {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<EventStatus | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useAdminEvents({
    q: query || undefined,
    status: status || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page,
    limit: PAGE_SIZE,
  });

  const events = data?.events ?? [];
  const total = data?.total ?? 0;

  useEffect(() => {
    if (isLoading) return;
    if (total === 0) {
      if (page > 1) setPage(1);
      return;
    }
    const totalPages = Math.ceil(total / PAGE_SIZE);
    if (page > totalPages) setPage(totalPages);
  }, [isLoading, total, page]);

  const publishMutation = useMutation({
    mutationFn: adminPublishEvent,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-events"] }),
  });

  function applyFilter(fn: () => void) {
    fn();
    setPage(1);
  }

  function clearFilters() {
    setQuery("");
    setStatus("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  const hasFilters = !!(query || status || dateFrom || dateTo);

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

      <div className="bg-surface-low border border-outline-variant rounded-sm p-4 flex flex-col lg:flex-row gap-3 lg:items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-display font-semibold uppercase tracking-tight text-on-surface/50 mb-2">
            Busca
          </label>
          <input
            type="text"
            placeholder="Time, título, liga…"
            value={query}
            onChange={(e) => applyFilter(() => setQuery(e.target.value))}
            className="w-full bg-surface-lowest px-4 py-2.5 text-sm text-on-surface font-body rounded-sm border border-outline-variant placeholder:text-on-surface/30 focus:outline-none focus:border-accent transition-colors duration-150"
          />
        </div>

        <div className="w-full lg:w-48">
          <FilterSelect
            label="Status"
            value={status}
            onChange={(v) => applyFilter(() => setStatus(v as EventStatus | ""))}
            options={STATUS_OPTIONS}
          />
        </div>

        <div className="w-full lg:w-40">
          <label className="block text-xs font-display font-semibold uppercase tracking-tight text-on-surface/50 mb-2">
            De
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => applyFilter(() => setDateFrom(e.target.value))}
            className="w-full bg-surface-lowest px-3 py-2.5 text-sm text-on-surface font-body rounded-sm border border-outline-variant focus:outline-none focus:border-accent transition-colors duration-150"
          />
        </div>

        <div className="w-full lg:w-40">
          <label className="block text-xs font-display font-semibold uppercase tracking-tight text-on-surface/50 mb-2">
            Até
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => applyFilter(() => setDateTo(e.target.value))}
            className="w-full bg-surface-lowest px-3 py-2.5 text-sm text-on-surface font-body rounded-sm border border-outline-variant focus:outline-none focus:border-accent transition-colors duration-150"
          />
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs font-body text-on-surface/50 hover:text-error underline underline-offset-2 transition-colors duration-150 lg:self-end lg:pb-3"
          >
            Limpar
          </button>
        )}
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

      {!isLoading && !isError && events.length === 0 && (
        <div className="text-center py-16 text-on-surface/40 font-body text-sm">
          {hasFilters ? (
            <>Nenhum evento encontrado com esses filtros.</>
          ) : (
            <>
              Nenhum evento cadastrado.{" "}
              <Link href="/admin/events/new" className="text-accent hover:underline">
                Criar agora
              </Link>
              .
            </>
          )}
        </div>
      )}

      {!isLoading && events.length > 0 && (
        <>
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

          <Pagination
            page={page}
            total={total}
            limit={PAGE_SIZE}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
