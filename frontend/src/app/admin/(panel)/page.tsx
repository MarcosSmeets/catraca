"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { adminListVenues, adminListEvents } from "@/lib/admin-api";

function StatCard({
  label,
  value,
  href,
  cta,
}: {
  label: string;
  value: number | undefined;
  href: string;
  cta: string;
}) {
  return (
    <div className="bg-surface-low border border-outline-variant rounded-sm p-6 flex flex-col gap-4">
      <div>
        <p className="text-xs font-display font-semibold uppercase tracking-tight text-on-surface/40">
          {label}
        </p>
        <p className="text-4xl font-display font-black text-on-surface mt-1">
          {value ?? "—"}
        </p>
      </div>
      <Link
        href={href}
        className="text-sm font-display font-semibold text-accent hover:underline underline-offset-2"
      >
        {cta} →
      </Link>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { data: venues } = useQuery({
    queryKey: ["admin-venues"],
    queryFn: adminListVenues,
  });

  const { data: events } = useQuery({
    queryKey: ["admin-events"],
    queryFn: adminListEvents,
  });

  const draftCount = events?.filter((e) => e.status === "DRAFT").length ?? 0;
  const onSaleCount = events?.filter((e) => e.status === "ON_SALE").length ?? 0;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display font-black text-3xl text-on-surface tracking-tight">
          Dashboard
        </h1>
        <p className="text-on-surface/50 font-body text-sm mt-1">
          Visão geral do painel administrativo.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Estádios"
          value={venues?.length}
          href="/admin/venues"
          cta="Ver estádios"
        />
        <StatCard
          label="Eventos totais"
          value={events?.length}
          href="/admin/events"
          cta="Ver eventos"
        />
        <StatCard
          label="Em rascunho"
          value={draftCount}
          href="/admin/events"
          cta="Gerenciar"
        />
        <StatCard
          label="À venda"
          value={onSaleCount}
          href="/admin/events"
          cta="Ver detalhes"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/admin/venues/new"
          className="group bg-surface-low border border-outline-variant rounded-sm p-6 hover:border-accent transition-colors duration-150 flex flex-col gap-2"
        >
          <p className="text-xs font-display font-semibold uppercase tracking-tight text-on-surface/40">
            Ação rápida
          </p>
          <p className="font-display font-black text-lg text-on-surface group-hover:text-accent transition-colors duration-150">
            Cadastrar estádio →
          </p>
        </Link>
        <Link
          href="/admin/events/new"
          className="group bg-surface-low border border-outline-variant rounded-sm p-6 hover:border-accent transition-colors duration-150 flex flex-col gap-2"
        >
          <p className="text-xs font-display font-semibold uppercase tracking-tight text-on-surface/40">
            Ação rápida
          </p>
          <p className="font-display font-black text-lg text-on-surface group-hover:text-accent transition-colors duration-150">
            Criar novo evento →
          </p>
        </Link>
      </div>
    </div>
  );
}
