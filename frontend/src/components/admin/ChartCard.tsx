"use client";

import { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyLabel?: string;
  minHeight?: number;
  headerRight?: ReactNode;
  children: ReactNode;
}

export function ChartCard({
  title,
  subtitle,
  isLoading,
  isEmpty,
  emptyLabel = "Sem dados ainda.",
  minHeight = 280,
  headerRight,
  children,
}: ChartCardProps) {
  return (
    <div className="bg-surface-low border border-outline-variant rounded-sm p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display font-black text-lg text-on-surface tracking-tight">
            {title}
          </h3>
          {subtitle ? (
            <p className="text-xs text-on-surface/50 font-body mt-1">{subtitle}</p>
          ) : null}
        </div>
        {headerRight ? <div className="shrink-0">{headerRight}</div> : null}
      </div>

      <div style={{ minHeight }} className="flex flex-col justify-center">
        {isLoading ? (
          <div
            className="animate-pulse bg-on-surface/5 rounded-sm w-full"
            style={{ height: minHeight }}
          />
        ) : isEmpty ? (
          <div
            className="flex items-center justify-center text-sm text-on-surface/40 font-body"
            style={{ minHeight }}
          >
            {emptyLabel}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
