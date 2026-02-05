const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [],
  // Avoid missing vendor-chunks in pnpm monorepo
  experimental: {
    serverComponentsExternalPackages: ['next-intl', '@formatjs/icu-messageformat-parser'],
  },
  // Fix pnpm: Next server looks for react/jsx-runtime.js in apps/web/node_modules; ensure correct resolution
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'react/jsx-runtime.js': require.resolve('react/jsx-runtime'),
      'react/jsx-dev-runtime.js': require.resolve('react/jsx-dev-runtime'),
    };
    return config;
  },
};

module.exports = withNextIntl(nextConfig);
