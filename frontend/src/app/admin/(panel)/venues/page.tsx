"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useAdminVenues, useAdminVenueStates } from "@/lib/admin-api";
import { Button, FilterSelect, Pagination } from "@/components/ui";

const PAGE_SIZE = 10;

export default function AdminVenuesPage() {
  const [query, setQuery] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [page, setPage] = useState(1);

  const { data: states } = useAdminVenueStates();

  const stateOptions = useMemo(
    () => [
      { value: "", label: "Todas as UFs" },
      ...(states ?? []).map((s) => ({ value: s, label: s })),
    ],
    [states]
  );

  const { data, isLoading, isError } = useAdminVenues({
    q: query || undefined,
    state: state || undefined,
    city: city || undefined,
    page,
    limit: PAGE_SIZE,
  });

  const venues = data?.venues ?? [];
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

  function applyFilter(fn: () => void) {
    fn();
    setPage(1);
  }

  function clearFilters() {
    setQuery("");
    setState("");
    setCity("");
    setPage(1);
  }

  const hasFilters = !!(query || state || city);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-black text-3xl text-on-surface tracking-tight">
            Estádios
          </h1>
          <p className="text-on-surface/50 font-body text-sm mt-1">
            Gerenciar estádios cadastrados na plataforma.
          </p>
        </div>
        <Link href="/admin/venues/new">
          <Button variant="primary" size="md">
            + Novo Estádio
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
            placeholder="Nome, cidade, UF…"
            value={query}
            onChange={(e) => applyFilter(() => setQuery(e.target.value))}
            className="w-full bg-surface-lowest px-4 py-2.5 text-sm text-on-surface font-body rounded-sm border border-outline-variant placeholder:text-on-surface/30 focus:outline-none focus:border-accent transition-colors duration-150"
          />
        </div>

        <div className="w-full lg:w-40">
          <FilterSelect
            label="UF"
            value={state}
            onChange={(v) => applyFilter(() => setState(v))}
            options={stateOptions}
          />
        </div>

        <div className="w-full lg:w-52">
          <label className="block text-xs font-display font-semibold uppercase tracking-tight text-on-surface/50 mb-2">
            Cidade
          </label>
          <input
            type="text"
            placeholder="Ex: São Paulo"
            value={city}
            onChange={(e) => applyFilter(() => setCity(e.target.value))}
            className="w-full bg-surface-lowest px-4 py-2.5 text-sm text-on-surface font-body rounded-sm border border-outline-variant placeholder:text-on-surface/30 focus:outline-none focus:border-accent transition-colors duration-150"
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
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-14 bg-surface-low rounded-sm animate-pulse"
            />
          ))}
        </div>
      )}

      {isError && (
        <p className="text-sm font-body text-error bg-error/5 px-4 py-3 rounded-sm">
          Falha ao carregar estádios.
        </p>
      )}

      {!isLoading && !isError && venues.length === 0 && (
        <div className="text-center py-16 text-on-surface/40 font-body text-sm">
          {hasFilters ? (
            <>Nenhum estádio encontrado com esses filtros.</>
          ) : (
            <>
              Nenhum estádio cadastrado.{" "}
              <Link href="/admin/venues/new" className="text-accent hover:underline">
                Cadastrar agora
              </Link>
              .
            </>
          )}
        </div>
      )}

      {!isLoading && venues.length > 0 && (
        <>
          <div className="border border-outline-variant rounded-sm overflow-hidden">
            <table className="w-full text-sm font-body">
              <thead className="bg-surface-low border-b border-outline-variant">
                <tr>
                  <th className="text-left px-4 py-3 font-display font-semibold text-xs uppercase tracking-tight text-on-surface/50">
                    Nome
                  </th>
                  <th className="text-left px-4 py-3 font-display font-semibold text-xs uppercase tracking-tight text-on-surface/50">
                    Cidade / UF
                  </th>
                  <th className="text-right px-4 py-3 font-display font-semibold text-xs uppercase tracking-tight text-on-surface/50">
                    Capacidade
                  </th>
                </tr>
              </thead>
              <tbody>
                {venues.map((venue, idx) => (
                  <tr
                    key={venue.id}
                    className={[
                      "transition-colors duration-100 hover:bg-surface-low",
                      idx !== venues.length - 1 ? "border-b border-outline-variant" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <td className="px-4 py-3 font-display font-semibold text-on-surface">
                      {venue.name}
                    </td>
                    <td className="px-4 py-3 text-on-surface/60">
                      {venue.city} / {venue.state}
                    </td>
                    <td className="px-4 py-3 text-right text-on-surface/60">
                      {venue.capacity.toLocaleString("pt-BR")}
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
