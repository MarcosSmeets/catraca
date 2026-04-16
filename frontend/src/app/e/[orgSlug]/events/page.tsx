"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import MainLayout from "@/components/features/MainLayout";
import EventCard from "@/components/features/EventCard";
import { EventCardSkeleton } from "@/components/ui/Skeleton";
import { useEvents } from "@/lib/events-api";

export default function TenantEventsPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const slug = typeof orgSlug === "string" ? orgSlug : "";
  const { data, isLoading } = useEvents(slug, {
    limit: 24,
    dateFrom: new Date().toISOString().split("T")[0],
  });
  const events = data?.events ?? [];

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8">
          <p className="text-xs font-body uppercase tracking-widest text-on-surface/40 mb-1">
            Catálogo
          </p>
          <h1 className="font-display font-black text-2xl md:text-3xl text-on-surface tracking-tight uppercase">
            Eventos
          </h1>
          <p className="text-sm text-on-surface/50 mt-2">
            <Link href="/" className="text-accent hover:underline">
              Voltar ao início
            </Link>
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => <EventCardSkeleton key={i} />)
            : events.map((event) => (
                <EventCard key={event.id} event={event} orgSlug={slug} />
              ))}
        </div>
      </div>
    </MainLayout>
  );
}
