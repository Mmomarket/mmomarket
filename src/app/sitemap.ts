import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXTAUTH_URL ?? "https://mmomarket.com.br";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/negociar`,
      lastModified: new Date(),
      changeFrequency: "always",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/registro`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  try {
    const res = await fetch(`${BASE_URL}/api/games`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const games: { id: string; updatedAt?: string }[] = await res.json();
      const gameRoutes: MetadataRoute.Sitemap = games.map((g) => ({
        url: `${BASE_URL}/negociar?game=${g.id}`,
        lastModified: g.updatedAt ? new Date(g.updatedAt) : new Date(),
        changeFrequency: "hourly",
        priority: 0.8,
      }));
      return [...staticRoutes, ...gameRoutes];
    }
  } catch {
    // Fall back to static routes only
  }

  return staticRoutes;
}
