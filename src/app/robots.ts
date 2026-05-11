import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/carteira", "/historico", "/verificacao"],
    },
    sitemap: `${process.env.NEXTAUTH_URL ?? "https://mmomarket.com.br"}/sitemap.xml`,
  };
}
