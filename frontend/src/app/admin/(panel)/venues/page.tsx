"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { adminListVenues } from "@/lib/admin-api";
import { Button } from "@/components/ui";

export default function AdminVenuesPage() {
  const { data: venues, isLoading, isError } = useQuery({
    queryKey: ["admin-venues"],
    queryFn: adminListVenues,
  });

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

      {!isLoading && !isError && venues && venues.length === 0 && (
        <div className="text-center py-16 text-on-surface/40 font-body text-sm">
          Nenhum estádio cadastrado.{" "}
          <Link href="/admin/venues/new" className="text-accent hover:underline">
            Cadastrar agora
          </Link>
          .
        </div>
      )}

      {!isLoading && venues && venues.length > 0 && (
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
      )}
    </div>
  );
}
