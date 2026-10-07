/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "fastcash-geneve.ch" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  async redirects() {
    return [
      // Legacy PrestaShop product URLs are redirected at the platform layer.
      // This avoids invoking the dynamic legacy route and, importantly, avoids
      // any database lookup for bot/crawler traffic hitting historical URLs.
      {
        source: "/:legacy/:id(\\d{1,})-:slug(.*)\\.html",
        destination: "/produits/:slug-:id",
        permanent: true,
      },
      { source: "/2-accueil", destination: "/", permanent: true },
      { source: "/accueil", destination: "/", permanent: true },
      { source: "/luxe", destination: "/categories/luxe", permanent: true },
      {
        source: "/telephonie",
        destination: "/categories/telephonie",
        permanent: true,
      },
      {
        source: "/informatique",
        destination: "/categories/informatique",
        permanent: true,
      },
      {
        source: "/imageson",
        destination: "/categories/image-et-son",
        permanent: true,
      },
      {
        source: "/image-son",
        destination: "/categories/image-et-son",
        permanent: true,
      },
      {
        source: "/consoles-jeux-video",
        destination: "/categories/consoles-jeux-video",
        permanent: true,
      },
      {
        source: "/console-jeux-video",
        destination: "/categories/consoles-jeux-video",
        permanent: true,
      },
      {
        source: "/bonnes-affaires",
        destination: "/categories/bonnes-affaires",
        permanent: true,
      },
      {
        source: "/maroquinerie",
        destination: "/categories/maroquinerie",
        permanent: true,
      },
      { source: "/montre", destination: "/categories/montre", permanent: true },
      { source: "/nous-contacter", destination: "/contact", permanent: true },
      { source: "/magasins", destination: "/contact", permanent: true },
      { source: "/nouveaux-produits", destination: "/", permanent: true },
    ];
  },

  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
      },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      { key: "X-DNS-Prefetch-Control", value: "on" },
    ];

    if (process.env.NODE_ENV === "production") {
      securityHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
    }

    return [
      { source: "/(.*)", headers: securityHeaders },
      {
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/admin/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive, nosnippet, noimageindex",
          },
        ],
      },
      {
        source: "/pilotage/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive, nosnippet, noimageindex",
          },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
