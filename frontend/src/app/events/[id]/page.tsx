import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { mockEvents, formatCurrency } from "@/lib/mock-data";
import EventPageClient from "./EventPageClient";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const event = mockEvents.find((e) => e.id === id);

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

export async function generateStaticParams() {
  return mockEvents.map((event) => ({ id: event.id }));
}

export default async function EventPage({ params }: Props) {
  const { id } = await params;
  const event = mockEvents.find((e) => e.id === id);
  if (!event) notFound();

  const jsonLd = {
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
      url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://catraca.com.br"}/events/${event.id}`,
    },
    image: event.imageUrl,
    competitor: [
      { "@type": "SportsTeam", name: event.homeTeam },
      { "@type": "SportsTeam", name: event.awayTeam },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <EventPageClient id={id} />
    </>
  );
}
