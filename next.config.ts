import type { NextConfig } from "next";

// Cabeçalhos básicos. A CSP sai do src/proxy.ts, com nonce por requisição.
const cabecalhosSeguranca = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // A planilha de importação (até 10 MB) viaja numa Server Action.
  experimental: { serverActions: { bodySizeLimit: "12mb" } },
  // Sem cacheComponents: a CSP com nonce exige renderização por requisição
  // (o shell estático não teria o nonce). Ver docs/fases/fase-1.md.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: cabecalhosSeguranca }];
  },
};

export default nextConfig;
