/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || '',
  webpack: (config) => {
    config.resolve.fallback = {
      fs: false,
    };
    return config;
  },
  images: {
    domains: ['cdn-production-opera-website.operacdn.com','22d5-240b-c010-4a4-d8a9-68e2-83b2-38b8-e125.ngrok-free.app'],
  },
  // Make environment variables available to the browser
  env: {
    NEXT_PUBLIC_BASE_PATH: process.env.NEXT_PUBLIC_BASE_PATH || '',
  },
};

module.exports = nextConfig;