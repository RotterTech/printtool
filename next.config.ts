import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dit is de magische regel voor Next.js 15/16
  serverExternalPackages: ['@thiagoelg/node-printer'],

  // Turbopack config (required for Next.js 16)
  turbopack: {},

  // Als je nog specifieke webpack settings nodig hebt voor .node files:
  webpack: (config) => {
    config.externals.push({
      '@thiagoelg/node-printer': 'commonjs @thiagoelg/node-printer',
    });
    return config;
  },

  // Allow cross-origin requests during development
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Credentials",
            value: "true",
          },
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,OPTIONS,PATCH,DELETE,POST,PUT",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
          },
        ],
      },
    ];
  },
};

export default nextConfig;