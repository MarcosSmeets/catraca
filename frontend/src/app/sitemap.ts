import type { MetadataRoute } from "next";
import { PUBLIC_API_BASE_URL } from "@/lib/public-api-base";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://catraca.com.br";
const API_URL = PUBLIC_API_BASE_URL;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/search`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE_URL}/termos`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.2 },
    { url: `${BASE_URL}/privacidade`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.2 },
  ];

  let eventRoutes: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${API_URL}/events?limit=100`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json() as { events: { id: string; status: string }[] };
      eventRoutes = data.events.map((event) => ({
        url: `${BASE_URL}/events/${event.id}`,
        lastModified: new Date(),
        changeFrequency: "daily" as const,
        priority: event.status === "ON_SALE" ? 0.8 : 0.4,
      }));
    }
  } catch {
    // API not available at build time
  }

  return [...staticRoutes, ...eventRoutes];
}
