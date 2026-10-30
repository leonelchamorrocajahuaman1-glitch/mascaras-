import type { NextConfig } from "next";

const supabaseHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : null;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // El proxy (protección de /api/admin) almacena el cuerpo de la petición: permite subir modelos 3D de hasta 60 MB.
    proxyClientMaxBodySize: "64mb",
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: supabaseHost ? [{ protocol: "https", hostname: supabaseHost }] : [],
  },
  // Rutas antiguas del panel → nuevas rutas en español.
  async redirects() {
    return [
      { source: "/admin/products", destination: "/admin/productos", permanent: true },
      { source: "/admin/products/new", destination: "/admin/productos/nuevo", permanent: true },
      { source: "/admin/products/:id", destination: "/admin/productos/:id", permanent: true },
      { source: "/admin/orders", destination: "/admin/pedidos", permanent: true },
      { source: "/admin/orders/:id", destination: "/admin/pedidos/:id", permanent: true },
      { source: "/admin/models", destination: "/admin/modelos-3d", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        source: "/admin/(.*)",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
