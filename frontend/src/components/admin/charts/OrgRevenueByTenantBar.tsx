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
import { formatCurrency } from "@/lib/mock-data";
import type { OrgRevenueMetric } from "@/lib/admin-api";

interface OrgRevenueByTenantBarProps {
  data: OrgRevenueMetric[];
}

interface Row extends OrgRevenueMetric {
  label: string;
}

interface TooltipPayloadItem {
  value: number;
  payload: Row;
}

function OrgTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  return (
    <div className="bg-surface-low border border-outline-variant rounded-sm px-3 py-2 shadow-lg max-w-xs">
      <p className="text-xs font-display font-semibold uppercase tracking-tight text-on-surface/60">
        {point.name}
      </p>
      <p className="text-sm font-display font-black text-on-surface mt-0.5">
        30 dias: {formatCurrency(point.revenue30dCents)}
      </p>
      <p className="text-xs text-on-surface/50 mt-1">Total: {formatCurrency(point.revenueAllCents)}</p>
    </div>
  );
}

export function OrgRevenueByTenantBar({ data }: OrgRevenueByTenantBarProps) {
  const rows: Row[] = data.map((d) => ({
    ...d,
    label: d.name.length > 22 ? `${d.name.slice(0, 20)}…` : d.name,
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(260, rows.length * 36)}>
      <BarChart
        data={rows}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
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
          tickFormatter={(v) => formatCurrency(Number(v))}
        />
        <YAxis
          dataKey="label"
          type="category"
          width={120}
          stroke="var(--color-on-surface)"
          strokeOpacity={0.3}
          tick={{ fill: "var(--color-on-surface)", fillOpacity: 0.6, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<OrgTooltip />} cursor={{ fill: "var(--color-on-surface)", fillOpacity: 0.06 }} />
        <Bar dataKey="revenue30dCents" fill="var(--color-accent)" radius={[0, 2, 2, 0]} name="Receita 30d" />
      </BarChart>
    </ResponsiveContainer>
  );
}
