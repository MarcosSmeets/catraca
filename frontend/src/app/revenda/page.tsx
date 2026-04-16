"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/features/MainLayout";
import Button from "@/components/ui/Button";
import { SeatMapSkeleton } from "@/components/ui/Skeleton";
import { formatCurrency, formatDate } from "@/lib/mock-data";
import { useResaleListingsMarketplace } from "@/lib/resale-api";

export default function RevendaMarketplacePage() {
  const router = useRouter();
  const { data: listings, isLoading, isError } = useResaleListingsMarketplace();

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="font-display font-bold text-2xl sm:text-3xl uppercase text-on-surface tracking-tight">
            Revenda
          </h1>
          <p className="mt-2 text-sm font-body text-on-surface/50 max-w-xl">
            Ingressos anunciados por titulares. O pagamento é feito pela Catraca (Stripe); o repasse ao vendedor é
            tratado pela plataforma.
          </p>
        </div>

        {isLoading && (
          <div className="space-y-4">
            <SeatMapSkeleton />
          </div>
        )}

        {isError && (
          <p className="text-sm font-body text-on-surface/50">Não foi possível carregar os anúncios. Tente de novo.</p>
        )}

        {!isLoading && !isError && listings && listings.length === 0 && (
          <p className="text-sm font-body text-on-surface/50">Nenhum ingresso em revenda no momento.</p>
        )}

        {!isLoading && listings && listings.length > 0 && (
          <ul className="space-y-4">
            {listings.map((l) => (
              <li
                key={l.id}
                className="rounded-sm border border-outline-variant bg-surface p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="font-display font-bold text-lg text-on-surface truncate">
                    {l.homeTeam} <span className="text-on-surface/40 font-normal">vs</span> {l.awayTeam}
                  </p>
                  <p className="text-xs font-body text-on-surface/45 mt-1">
                    {formatDate(l.eventStartsAt)}
                    {l.section && (
                      <>
                        {" · "}
                        {l.section}
                        {l.row && ` fila ${l.row}`}
                        {l.number && ` assento ${l.number}`}
                      </>
                    )}
                  </p>
                  <Link
                    href={`/orgs/${encodeURIComponent(l.organizationSlug)}/events/${encodeURIComponent(l.eventId)}`}
                    className="text-xs font-body text-primary hover:underline mt-2 inline-block"
                  >
                    Ver evento
                  </Link>
                </div>
                <div className="flex flex-col sm:items-end gap-2 shrink-0">
                  <p className="font-display font-bold text-xl text-primary">{formatCurrency(l.priceCents)}</p>
                  <Button size="sm" onClick={() => router.push(`/checkout/resale/${encodeURIComponent(l.id)}`)}>
                    Comprar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </MainLayout>
  );
}
