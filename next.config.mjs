/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["ffmpeg-static"],
    serverActions: {
      bodySizeLimit: "10mb",
    },
    // Kling / avatar video jobs regularly exceed 5 minutes under queue load.
    proxyTimeout: 600_000,
    // Ensure the ~80MB ffmpeg binary is shipped with the export serverless function.
    outputFileTracingIncludes: {
      "/api/projects/[id]/export": ["./node_modules/ffmpeg-static/**/*"],
      "/api/generate/audio": ["./node_modules/ffmpeg-static/**/*"],
      "/api/generate/video": ["./node_modules/ffmpeg-static/**/*"],
    },
  },
};

export default nextConfig;
