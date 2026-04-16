"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  useAdminVenues,
  useAdminEvents,
  useAdminMetrics,
  type DashboardMetrics,
  type OrderStatusMetric,
  type TicketStatusCount,
} from "@/lib/admin-api";
import { formatCurrency } from "@/lib/mock-data";
import { StatCard } from "@/components/admin/StatCard";
import { ChartCard } from "@/components/admin/ChartCard";
import { RevenueLineChart } from "@/components/admin/charts/RevenueLineChart";
import { TicketsBySectionBar } from "@/components/admin/charts/TicketsBySectionBar";
import { TicketsBySportBar } from "@/components/admin/charts/TicketsBySportBar";
import { TicketStatusDonut } from "@/components/admin/charts/TicketStatusDonut";
import { OrderStatusDonut } from "@/components/admin/charts/OrderStatusDonut";
import { StadiumOccupancyTable } from "@/components/admin/StadiumOccupancyTable";
import { TopEventsTable } from "@/components/admin/TopEventsTable";

const TICKET_STATUSES: TicketStatusCount["status"][] = ["VALID", "USED", "CANCELLED"];

function mergeTicketStatuses(rows: TicketStatusCount[] | undefined): TicketStatusCount[] {
  const map = new Map((rows ?? []).map((r) => [r.status, r.count]));
  return TICKET_STATUSES.map((status) => ({
    status,
    count: map.get(status) ?? 0,
  }));
}

const ORDER_STATUSES: OrderStatusMetric["status"][] = ["PENDING", "PAID", "FAILED", "REFUNDED"];

function mergeOrderStatuses(rows: OrderStatusMetric[] | undefined): OrderStatusMetric[] {
  const by = new Map((rows ?? []).map((r) => [r.status, r]));
  return ORDER_STATUSES.map((status) => {
    const r = by.get(status);
    return (
      r ?? {
        status,
        countAll: 0,
        count30d: 0,
        amountAllCents: 0,
        amount30dCents: 0,
      }
    );
  });
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-display font-black text-xl text-on-surface tracking-tight border-b border-outline-variant pb-2">
      {children}
    </h2>
  );
}

export default function AdminDashboardPage() {
  const { data: venues } = useAdminVenues({ limit: 1 });
  const { data: events } = useAdminEvents({ limit: 1 });
  const { data: drafts } = useAdminEvents({ status: "DRAFT", limit: 1 });
  const { data: onSale } = useAdminEvents({ status: "ON_SALE", limit: 1 });
  const { data: metrics, isLoading: metricsLoading, isSuccess: metricsReady } = useAdminMetrics();

  const draftCount = drafts?.total ?? 0;
  const onSaleCount = onSale?.total ?? 0;

  const m: DashboardMetrics | undefined = metricsReady ? metrics : undefined;
  const fin = m?.financial;

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-3xl text-on-surface tracking-tight">
            Dashboard
          </h1>
          <p className="text-on-surface/50 font-body text-sm mt-1">
            Visão geral do painel administrativo.
          </p>
        </div>
        <p className="text-xs font-display font-semibold uppercase tracking-tight text-on-surface/40 shrink-0 sm:pt-1">
          Últimos 30 dias · Total
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Estádios"
          value={venues?.total}
          href="/admin/venues"
          cta="Ver estádios"
        />
        <StatCard
          label="Eventos totais"
          value={events?.total}
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

      <div className="flex flex-col gap-6">
        <SectionTitle>Financeiro</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Receita total"
            value={fin ? formatCurrency(fin.revenueAllCents) : undefined}
            subtitle="Pedidos pagos (histórico)"
          />
          <StatCard
            label="Receita (30 dias)"
            value={fin ? formatCurrency(fin.revenue30dCents) : undefined}
          />
          <StatCard
            label="Ticket médio"
            value={fin ? formatCurrency(fin.avgTicketAllCents) : undefined}
            subtitle="Preço base médio por ingresso pago"
          />
          <StatCard
            label="Taxa de serviço (30 dias)"
            value={fin ? formatCurrency(fin.serviceFees30dCents) : undefined}
          />
        </div>
        <ChartCard
          title="Receita diária"
          subtitle="Pedidos pagos — últimos 30 dias (fuso America/Sao_Paulo)"
          isLoading={metricsLoading}
          isEmpty={false}
        >
          {m ? <RevenueLineChart data={m.dailyRevenue} /> : null}
        </ChartCard>
      </div>

      <div className="flex flex-col gap-6">
        <SectionTitle>Ingressos</SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard
            title="Vendidos por setor"
            subtitle="Top 10 — pedidos pagos"
            isLoading={metricsLoading}
            isEmpty={!m?.ticketSections.length}
          >
            {m && m.ticketSections.length > 0 ? (
              <TicketsBySectionBar data={m.ticketSections} />
            ) : null}
          </ChartCard>
          <ChartCard
            title="Status dos ingressos"
            isLoading={metricsLoading}
            isEmpty={!m}
          >
            {m ? <TicketStatusDonut data={mergeTicketStatuses(m.ticketStatuses)} /> : null}
          </ChartCard>
        </div>
        <ChartCard
          title="Por esporte"
          subtitle="Pedidos pagos"
          isLoading={metricsLoading}
          isEmpty={!m?.ticketSports.length}
        >
          {m && m.ticketSports.length > 0 ? <TicketsBySportBar data={m.ticketSports} /> : null}
        </ChartCard>
        <ChartCard title="Top eventos" subtitle="Por ingressos vendidos (pagos)" isLoading={metricsLoading} isEmpty={false}>
          {m ? <TopEventsTable data={m.topEvents} /> : null}
        </ChartCard>
      </div>

      <div className="flex flex-col gap-6">
        <SectionTitle>Estádios</SectionTitle>
        <ChartCard
          title="Ocupação e receita"
          subtitle="Capacidade, eventos ativos e ingressos pagos"
          isLoading={metricsLoading}
          isEmpty={!m?.stadiums.length}
          minHeight={200}
        >
          {m && m.stadiums.length > 0 ? <StadiumOccupancyTable data={m.stadiums} /> : null}
        </ChartCard>
      </div>

      <div className="flex flex-col gap-6">
        <SectionTitle>Pedidos</SectionTitle>
        <ChartCard
          title="Pedidos por status"
          subtitle="Volume e valor (toggle 30 dias / total)"
          isLoading={metricsLoading}
          isEmpty={!m}
          minHeight={320}
        >
          {m ? <OrderStatusDonut data={mergeOrderStatuses(m.orderStatuses)} /> : null}
        </ChartCard>
      </div>
    </div>
  );
}
