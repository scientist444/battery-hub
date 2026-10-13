/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Don't reuse cached pages during in-app navigation, so price/stock edits show right away.
    staleTimes: { dynamic: 0 },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
    ],
  },
};

module.exports = nextConfig;
