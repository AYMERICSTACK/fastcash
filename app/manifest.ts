import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FAST CASH Genève",
    short_name: "FAST CASH",
    description: "Produits premium d'occasion à Genève.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#111111",
    lang: "fr-CH",
    icons: [
      {
        src: "/images/logo-fastcash.jpg",
        sizes: "512x512",
        type: "image/jpeg",
      },
    ],
  };
}
