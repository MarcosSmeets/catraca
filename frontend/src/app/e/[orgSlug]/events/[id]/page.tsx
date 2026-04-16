import type { Metadata } from "next";
import { formatCurrency, type Event } from "@/lib/mock-data";
import { PUBLIC_API_BASE_URL } from "@/lib/public-api-base";
import EventPageClient from "@/app/events/[id]/EventPageClient";

const API_URL = PUBLIC_API_BASE_URL;

interface Props {
  params: Promise<{ orgSlug: string; id: string }>;
}

async function fetchEvent(orgSlug: string, id: string): Promise<Event | null> {
  try {
    const res = await fetch(`${API_URL}/orgs/${encodeURIComponent(orgSlug)}/events/${id}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug, id } = await params;
  const event = await fetchEvent(orgSlug, id);

  if (!event) {
    return { title: "Evento não encontrado — Catraca" };
  }

  const title = `${event.homeTeam} vs ${event.awayTeam} — ${event.league} | Catraca`;
  const description = `Ingressos para ${event.homeTeam} vs ${event.awayTeam} em ${event.venue.name}, ${event.venue.city}. A partir de ${formatCurrency(event.minPriceCents)}. Compre com segurança na Catraca.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: event.imageUrl, width: 800, alt: event.title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [event.imageUrl],
    },
  };
}

export default async function TenantEventPage({ params }: Props) {
  const { orgSlug, id } = await params;

  const event = await fetchEvent(orgSlug, id);

  const jsonLd = event
    ? {
        "@context": "https://schema.org",
        "@type": "SportsEvent",
        name: event.title,
        description: `${event.homeTeam} vs ${event.awayTeam} — ${event.league}`,
        startDate: event.startsAt,
        location: {
          "@type": "SportsActivityLocation",
          name: event.venue.name,
          address: {
            "@type": "PostalAddress",
            addressLocality: event.venue.city,
            addressRegion: event.venue.state,
            addressCountry: "BR",
          },
        },
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: "BRL",
          lowPrice: (event.minPriceCents / 100).toFixed(2),
          highPrice: (event.maxPriceCents / 100).toFixed(2),
          availability:
            event.status === "SOLD_OUT"
              ? "https://schema.org/SoldOut"
              : "https://schema.org/InStock",
          url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://catraca.com.br"}/e/${orgSlug}/events/${event.id}`,
        },
        image: event.imageUrl,
        competitor: [
          { "@type": "SportsTeam", name: event.homeTeam },
          { "@type": "SportsTeam", name: event.awayTeam },
        ],
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <EventPageClient id={id} orgSlug={orgSlug} />
    </>
  );
}
