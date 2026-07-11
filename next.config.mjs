/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["ffmpeg-static"],
    serverActions: {
      bodySizeLimit: "10mb",
    },
    // Vision LLM + fal queue can exceed the default 30s dev proxy limit.
    proxyTimeout: 300_000,
  },
};

export default nextConfig;
