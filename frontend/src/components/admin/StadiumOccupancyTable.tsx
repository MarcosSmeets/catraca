"use client";

import { formatCurrency } from "@/lib/mock-data";
import type { StadiumMetric } from "@/lib/admin-api";

interface StadiumOccupancyTableProps {
  data: StadiumMetric[];
}

function OccupancyBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value * 100));
  return (
    <div className="flex items-center gap-3 w-full">
      <div className="flex-1 h-1.5 bg-surface-high rounded-sm overflow-hidden">
        <div
          className="h-full bg-accent rounded-sm transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-body text-on-surface/70 tabular-nums w-11 text-right">
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

export function StadiumOccupancyTable({ data }: StadiumOccupancyTableProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-on-surface/40 font-body">
        Nenhum estádio cadastrado.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-6 px-6">
      <table className="w-full text-sm font-body">
        <thead>
          <tr className="text-xs font-display font-semibold uppercase tracking-tight text-on-surface/40 border-b border-outline-variant">
            <th className="text-left py-3 pr-4">Estádio</th>
            <th className="text-right py-3 px-2">Capacidade</th>
            <th className="text-right py-3 px-2">Eventos</th>
            <th className="text-right py-3 px-2">Vendidos</th>
            <th className="text-right py-3 px-2">Receita</th>
            <th className="text-left py-3 pl-4 min-w-[160px]">Ocupação</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {data.map((row) => (
            <tr key={row.id}>
              <td className="py-3 pr-4">
                <p className="text-on-surface font-display font-semibold">{row.name}</p>
                <p className="text-xs text-on-surface/50">
                  {row.city} · {row.state}
                </p>
              </td>
              <td className="py-3 px-2 text-right text-on-surface/80 tabular-nums">
                {row.capacity.toLocaleString("pt-BR")}
              </td>
              <td className="py-3 px-2 text-right text-on-surface/80 tabular-nums">
                {row.eventCount}
              </td>
              <td className="py-3 px-2 text-right text-on-surface tabular-nums">
                {row.ticketsSold}
              </td>
              <td className="py-3 px-2 text-right text-on-surface font-display font-semibold tabular-nums">
                {formatCurrency(row.revenueCents)}
              </td>
              <td className="py-3 pl-4">
                <OccupancyBar value={row.occupancy} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
