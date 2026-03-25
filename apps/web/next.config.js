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
    const apiRewrites = [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/:path*`,
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
