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

export interface ResaleListingCountRow {
  label: string;
  count: number;
}

interface ResaleListingsBarProps {
  data: ResaleListingCountRow[];
}

interface TooltipPayloadItem {
  value: number;
  payload: ResaleListingCountRow;
}

function Tip({
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
        {point.label}
      </p>
      <p className="text-sm font-display font-black text-on-surface mt-0.5">{point.count}</p>
    </div>
  );
}

export function ResaleListingsBar({ data }: ResaleListingsBarProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--color-on-surface)"
          strokeOpacity={0.08}
          vertical={false}
        />
        <XAxis
          dataKey="label"
          stroke="var(--color-on-surface)"
          strokeOpacity={0.3}
          tick={{ fill: "var(--color-on-surface)", fillOpacity: 0.6, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          allowDecimals={false}
          stroke="var(--color-on-surface)"
          strokeOpacity={0.3}
          tick={{ fill: "var(--color-on-surface)", fillOpacity: 0.5, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<Tip />} cursor={{ fill: "var(--color-on-surface)", fillOpacity: 0.06 }} />
        <Bar dataKey="count" fill="var(--color-primary)" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
