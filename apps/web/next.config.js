/**
 * Origem da API Express para o rewrite de /api/* no servidor Next.
 * Não use a porta do próprio Next (ex.: 3004), senão o proxy devolve HTML
 * e o login quebra com "Unexpected token '<'".
 */
function getApiProxyOrigin() {
  const explicit = process.env.API_PROXY_TARGET?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  let fromPublic = (process.env.NEXT_PUBLIC_API_URL || "").trim().replace(/\/$/, "");
  if (fromPublic && process.env.NODE_ENV === "development") {
    try {
      const u = new URL(fromPublic);
      const port = u.port || (u.protocol === "https:" ? "443" : "80");
      if (
        (u.hostname === "localhost" || u.hostname === "127.0.0.1") &&
        port === "3004"
      ) {
        return "http://localhost:3001";
      }
    } catch {
      /* ignore */
    }
  }
  return fromPublic || "http://localhost:3001";
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  ...(process.env.NEXT_OUTPUT_STANDALONE === 'true' ? { output: 'standalone' } : {}),
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async rewrites() {
    const apiOrigin = getApiProxyOrigin();
    const apiRewrites = [
      {
        source: '/api/:path*',
        destination: `${apiOrigin}/api/:path*`,
      },
    ];

    // Em dev, o Next não serve o Docusaurus: fazemos proxy para o servidor do docs-site (porta 3002).
    // Rode em outro terminal: cd docs-site && npm run start
    const skipDocsProxy =
      process.env.SKIP_DOCS_PROXY === '1' || process.env.SKIP_DOCS_PROXY === 'true';
    const docsDevBase =
      process.env.DOCS_DEV_URL?.replace(/\/$/, '') || 'http://localhost:3002';

    if (process.env.NODE_ENV === 'development' && !skipDocsProxy) {
      return [
        ...apiRewrites,
        { source: '/docs', destination: `${docsDevBase}/docs` },
        { source: '/docs/', destination: `${docsDevBase}/docs/` },
        { source: '/docs/:path*', destination: `${docsDevBase}/docs/:path*` },
      ];
    }

    return apiRewrites;
  },
  // Disable x-powered-by header for security
  poweredByHeader: false,
  // Enable compression
  compress: true,
};

module.exports = nextConfig;
