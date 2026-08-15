import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_SITE_URL || "https://fastcash-geneve.ch";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/pilotage/", "/compte/", "/panier", "/merci"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
