const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [],
  experimental: {
    // Éviter le chunk manquant pour next-intl (pnpm monorepo)
    serverComponentsExternalPackages: ['@formatjs/icu-messageformat-parser'],
  },
};

module.exports = withNextIntl(nextConfig);
