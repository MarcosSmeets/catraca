"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SectionCount } from "@/lib/admin-api";

interface TicketsBySectionBarProps {
  data: SectionCount[];
}

interface TooltipPayloadItem {
  value: number;
  payload: SectionCount;
}

function SectionTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  return (
    <div className="bg-surface-low border border-outline-variant rounded-sm px-3 py-2 shadow-lg">
      <p className="text-xs font-display font-semibold uppercase tracking-tight text-on-surface/60">
        Setor {point.section}
      </p>
      <p className="text-sm font-display font-black text-on-surface mt-0.5">
        {point.ticketsCount} {point.ticketsCount === 1 ? "ingresso" : "ingressos"}
      </p>
    </div>
  );
}

export function TicketsBySectionBar({ data }: TicketsBySectionBarProps) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(240, data.length * 32)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--color-on-surface)"
          strokeOpacity={0.08}
          horizontal={false}
        />
        <XAxis
          type="number"
          allowDecimals={false}
          stroke="var(--color-on-surface)"
          strokeOpacity={0.3}
          tick={{ fill: "var(--color-on-surface)", fillOpacity: 0.5, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          dataKey="section"
          type="category"
          width={90}
          stroke="var(--color-on-surface)"
          strokeOpacity={0.3}
          tick={{ fill: "var(--color-on-surface)", fillOpacity: 0.6, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          content={<SectionTooltip />}
          cursor={{ fill: "var(--color-on-surface)", fillOpacity: 0.06 }}
        />
        <Bar dataKey="ticketsCount" fill="var(--color-accent)" radius={[0, 2, 2, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
