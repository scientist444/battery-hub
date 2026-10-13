/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Don't reuse cached pages during in-app navigation, so price/stock edits show right away.
    staleTimes: { dynamic: 0 },
    // Admin product photos are resized in the browser first; this leaves headroom.
    serverActions: { bodySizeLimit: '4mb' },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
    ],
  },
};

module.exports = nextConfig;
