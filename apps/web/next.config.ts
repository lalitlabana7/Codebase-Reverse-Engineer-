import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "**.githubusercontent.com",
      },
    ],
  },
  transpilePackages: ["@codebuff/database", "@codebuff/shared", "@codebuff/ingestion"],
  // Ensure API routes use Node.js runtime (not Edge) for Neon DB + GitHub API
  serverExternalPackages: ["@neondatabase/serverless"],
};

export default nextConfig;
