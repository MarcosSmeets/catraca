"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/mock-data";
import type { DailyRevenuePoint } from "@/lib/admin-api";

interface RevenueLineChartProps {
  data: DailyRevenuePoint[];
}

const SP_TZ = "America/Sao_Paulo";

/** Calendar day keys matching SQL: DATE(created_at AT TIME ZONE 'America/Sao_Paulo'). */
function fillMissingDays(data: DailyRevenuePoint[]): DailyRevenuePoint[] {
  const byDay = new Map<string, DailyRevenuePoint>();
  for (const p of data) byDay.set(p.day, p);

  const dayFmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: SP_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const result: DailyRevenuePoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    const key = dayFmt.format(d);
    const existing = byDay.get(key);
    result.push(existing ?? { day: key, revenueCents: 0, ordersCount: 0 });
  }
  return result;
}

function formatDayTick(day: string): string {
  const [, month, d] = day.split("-");
  return `${d}/${month}`;
}

interface TooltipPayloadItem {
  value: number;
  payload: DailyRevenuePoint;
}

function RevenueTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0 || !label) return null;
  const point = payload[0].payload;
  return (
    <div className="bg-surface-low border border-outline-variant rounded-sm px-3 py-2 shadow-lg">
      <p className="text-xs font-display font-semibold text-on-surface/60 uppercase tracking-tight">
        {formatDayTick(label)}
      </p>
      <p className="text-sm font-display font-black text-on-surface mt-0.5">
        {formatCurrency(point.revenueCents)}
      </p>
      <p className="text-xs text-on-surface/50 font-body">
        {point.ordersCount} {point.ordersCount === 1 ? "pedido" : "pedidos"}
      </p>
    </div>
  );
}

export function RevenueLineChart({ data }: RevenueLineChartProps) {
  const series = fillMissingDays(data);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--color-on-surface)"
          strokeOpacity={0.08}
          vertical={false}
        />
        <XAxis
          dataKey="day"
          tickFormatter={formatDayTick}
          stroke="var(--color-on-surface)"
          strokeOpacity={0.3}
          tick={{ fill: "var(--color-on-surface)", fillOpacity: 0.5, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          minTickGap={24}
        />
        <YAxis
          tickFormatter={(v) => formatCurrency(v).replace(/\s/g, "")}
          stroke="var(--color-on-surface)"
          strokeOpacity={0.3}
          tick={{ fill: "var(--color-on-surface)", fillOpacity: 0.5, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={72}
        />
        <Tooltip
          content={<RevenueTooltip />}
          cursor={{ stroke: "var(--color-on-surface)", strokeOpacity: 0.15 }}
        />
        <Area
          type="monotone"
          dataKey="revenueCents"
          stroke="var(--color-accent)"
          strokeWidth={2}
          fill="url(#revenueFill)"
          activeDot={{
            r: 4,
            stroke: "var(--color-accent)",
            strokeWidth: 2,
            fill: "var(--color-surface-low)",
          }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
