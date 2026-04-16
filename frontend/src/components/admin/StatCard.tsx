"use client";

import Link from "next/link";

interface StatCardProps {
  label: string;
  value: string | number | undefined;
  href?: string;
  cta?: string;
  subtitle?: string;
}

export function StatCard({ label, value, href, cta, subtitle }: StatCardProps) {
  const displayValue = value === undefined || value === null ? "—" : value;

  return (
    <div className="bg-surface-low border border-outline-variant rounded-sm p-6 flex flex-col gap-4">
      <div>
        <p className="text-xs font-display font-semibold uppercase tracking-tight text-on-surface/40">
          {label}
        </p>
        <p className="text-3xl lg:text-4xl font-display font-black text-on-surface mt-1 break-words">
          {displayValue}
        </p>
        {subtitle ? (
          <p className="text-xs text-on-surface/50 font-body mt-1">{subtitle}</p>
        ) : null}
      </div>
      {href && cta ? (
        <Link
          href={href}
          className="text-sm font-display font-semibold text-accent hover:underline underline-offset-2"
        >
          {cta} →
        </Link>
      ) : null}
    </div>
  );
}
