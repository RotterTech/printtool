/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    // Forceer Next om de juiste root te gebruiken
    root: "./",
  },
  experimental: {
    optimizeCss: true,
    typedRoutes: true,
  },
};

export default nextConfig;
