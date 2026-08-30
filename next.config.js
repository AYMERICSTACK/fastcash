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
      { source: "/2-accueil", destination: "/", permanent: true },
      { source: "/accueil", destination: "/", permanent: true },
      { source: "/luxe", destination: "/categories/maroquinerie", permanent: true },
      { source: "/telephonie", destination: "/categories/telephonie", permanent: true },
      { source: "/informatique", destination: "/categories/informatique", permanent: true },
      { source: "/image-son", destination: "/categories/image-son", permanent: true },
      { source: "/consoles-jeux-video", destination: "/categories/consoles", permanent: true },
      { source: "/console-jeux-video", destination: "/categories/consoles", permanent: true },
      { source: "/bonnes-affaires", destination: "/promotions", permanent: true },
    ];
  },

  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      { key: "X-DNS-Prefetch-Control", value: "on" },
    ];

    if (process.env.NODE_ENV === "production") {
      securityHeaders.push({ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" });
    }

    return [
      { source: "/(.*)", headers: securityHeaders },
      {
        source: "/images/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
      },
      {
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet, noimageindex" }],
      },
      {
        source: "/pilotage/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet, noimageindex" }],
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
