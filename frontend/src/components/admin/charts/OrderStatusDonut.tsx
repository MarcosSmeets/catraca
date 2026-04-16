"use client";

import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency } from "@/lib/mock-data";
import type { OrderStatusMetric } from "@/lib/admin-api";

interface OrderStatusDonutProps {
  data: OrderStatusMetric[];
}

type Scope = "all" | "30d";

const STATUS_LABEL: Record<OrderStatusMetric["status"], string> = {
  PENDING: "Pendentes",
  PAID: "Pagos",
  FAILED: "Falharam",
  REFUNDED: "Estornados",
};

const STATUS_COLORS: Record<OrderStatusMetric["status"], string> = {
  PAID: "var(--color-accent)",
  PENDING: "var(--color-primary-container)",
  FAILED: "var(--color-error)",
  REFUNDED: "var(--color-surface-dim)",
};

interface ChartDatum {
  status: OrderStatusMetric["status"];
  count: number;
  amountCents: number;
}

interface TooltipPayloadItem {
  value: number;
  payload: ChartDatum;
}

function OrderTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  total: number;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  const pct = total > 0 ? ((point.count / total) * 100).toFixed(1) : "0.0";
  return (
    <div className="bg-surface-low border border-outline-variant rounded-sm px-3 py-2 shadow-lg">
      <p className="text-xs font-display font-semibold uppercase tracking-tight text-on-surface/60">
        {STATUS_LABEL[point.status]}
      </p>
      <p className="text-sm font-display font-black text-on-surface mt-0.5">
        {point.count}{" "}
        <span className="text-on-surface/50 font-body text-xs">({pct}%)</span>
      </p>
      <p className="text-xs text-on-surface/50 font-body">
        {formatCurrency(point.amountCents)}
      </p>
    </div>
  );
}

export function OrderStatusDonut({ data }: OrderStatusDonutProps) {
  const [scope, setScope] = useState<Scope>("all");

  const chartData: ChartDatum[] = data.map((d) => ({
    status: d.status,
    count: scope === "30d" ? d.count30d : d.countAll,
    amountCents: scope === "30d" ? d.amount30dCents : d.amountAllCents,
  }));

  const total = chartData.reduce((acc, d) => acc + d.count, 0);
  const visible = chartData.filter((d) => d.count > 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end gap-1 text-xs font-display font-semibold">
        <button
          type="button"
          onClick={() => setScope("30d")}
          className={`px-3 py-1 rounded-sm transition-colors ${
            scope === "30d"
              ? "bg-accent text-on-accent"
              : "bg-surface-high text-on-surface/60 hover:text-on-surface"
          }`}
        >
          30 dias
        </button>
        <button
          type="button"
          onClick={() => setScope("all")}
          className={`px-3 py-1 rounded-sm transition-colors ${
            scope === "all"
              ? "bg-accent text-on-accent"
              : "bg-surface-high text-on-surface/60 hover:text-on-surface"
          }`}
        >
          Total
        </button>
      </div>

      <div className="flex flex-col items-center gap-4">
        {total === 0 ? (
          <div className="flex items-center justify-center text-sm text-on-surface/40 font-body h-56">
            Nenhum pedido no período.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={visible}
                dataKey="count"
                nameKey="status"
                innerRadius={60}
                outerRadius={95}
                paddingAngle={2}
                strokeWidth={0}
              >
                {visible.map((entry) => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status]} />
                ))}
              </Pie>
              <Tooltip content={<OrderTooltip total={total} />} />
            </PieChart>
          </ResponsiveContainer>
        )}

        <div className="flex flex-wrap gap-3 justify-center">
          {chartData.map((entry) => (
            <div key={entry.status} className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: STATUS_COLORS[entry.status] }}
              />
              <span className="text-xs font-body text-on-surface/70">
                {STATUS_LABEL[entry.status]}{" "}
                <span className="text-on-surface/40">· {entry.count}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
