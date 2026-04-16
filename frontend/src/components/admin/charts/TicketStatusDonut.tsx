"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { TicketStatusCount } from "@/lib/admin-api";

interface TicketStatusDonutProps {
  data: TicketStatusCount[];
}

const STATUS_LABEL: Record<TicketStatusCount["status"], string> = {
  VALID: "Válidos",
  USED: "Usados",
  CANCELLED: "Cancelados",
};

const STATUS_COLORS: Record<TicketStatusCount["status"], string> = {
  VALID: "var(--color-accent)",
  USED: "var(--color-primary-container)",
  CANCELLED: "var(--color-error)",
};

interface TooltipPayloadItem {
  value: number;
  payload: { status: TicketStatusCount["status"]; count: number };
}

function StatusTooltip({
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
        {point.count} <span className="text-on-surface/50 font-body text-xs">({pct}%)</span>
      </p>
    </div>
  );
}

export function TicketStatusDonut({ data }: TicketStatusDonutProps) {
  const total = data.reduce((acc, d) => acc + d.count, 0);

  return (
    <div className="flex flex-col items-center gap-4">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="status"
            innerRadius={60}
            outerRadius={95}
            paddingAngle={2}
            strokeWidth={0}
          >
            {data.map((entry) => (
              <Cell key={entry.status} fill={STATUS_COLORS[entry.status]} />
            ))}
          </Pie>
          <Tooltip content={<StatusTooltip total={total} />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-3 justify-center">
        {data.map((entry) => (
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
  );
}
