"use client";

import { formatCurrency } from "@/lib/mock-data";
import type { TopEventMetric } from "@/lib/admin-api";

interface TopEventsTableProps {
  data: TopEventMetric[];
}

export function TopEventsTable({ data }: TopEventsTableProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-on-surface/40 font-body">
        Nenhum evento com ingressos vendidos.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-6 px-6">
      <table className="w-full text-sm font-body">
        <thead>
          <tr className="text-xs font-display font-semibold uppercase tracking-tight text-on-surface/40 border-b border-outline-variant">
            <th className="text-left py-3 pr-4 w-8">#</th>
            <th className="text-left py-3 pr-4">Evento</th>
            <th className="text-left py-3 px-2">Estádio</th>
            <th className="text-right py-3 px-2">Ingressos</th>
            <th className="text-right py-3 pl-2">Receita</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {data.map((row, idx) => (
            <tr key={row.eventId}>
              <td className="py-3 pr-4 text-on-surface/40 font-display font-black tabular-nums">
                {idx + 1}
              </td>
              <td className="py-3 pr-4">
                <p className="text-on-surface font-display font-semibold">
                  {row.homeTeam} × {row.awayTeam}
                </p>
                <p className="text-xs text-on-surface/50">{row.title}</p>
              </td>
              <td className="py-3 px-2 text-on-surface/70">{row.venueName}</td>
              <td className="py-3 px-2 text-right text-on-surface tabular-nums">
                {row.ticketsSold}
              </td>
              <td className="py-3 pl-2 text-right text-on-surface font-display font-semibold tabular-nums">
                {formatCurrency(row.revenueCents)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
