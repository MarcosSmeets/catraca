import type { MetadataRoute } from "next";
import { mockEvents } from "@/lib/mock-data";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://catraca.com.br";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/search`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/termos`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.2,
    },
    {
      url: `${BASE_URL}/privacidade`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.2,
    },
  ];

  const eventRoutes: MetadataRoute.Sitemap = mockEvents.map((event) => ({
    url: `${BASE_URL}/events/${event.id}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: event.status === "ON_SALE" ? 0.8 : 0.4,
  }));

  return [...staticRoutes, ...eventRoutes];
}
