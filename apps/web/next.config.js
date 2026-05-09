/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['finelo.ai', 'localhost'],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.API_URL || 'http://localhost:4000/api/:path*',
      },
      {
        source: '/ws',
        destination: process.env.WS_URL || 'ws://localhost:4000/ws',
      },
    ];
  },
  env: {
    API_URL: process.env.API_URL || 'http://localhost:4000',
    WS_URL: process.env.WS_URL || 'ws://localhost:4000',
  },
};

module.exports = nextConfig;
