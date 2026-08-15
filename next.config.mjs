/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["ffmpeg-static"],
    serverActions: {
      bodySizeLimit: "10mb",
    },
    // Kling / avatar video jobs regularly exceed 5 minutes under queue load.
    proxyTimeout: 600_000,
  },
};

export default nextConfig;
