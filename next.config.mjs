/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["ffmpeg-static"],
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
