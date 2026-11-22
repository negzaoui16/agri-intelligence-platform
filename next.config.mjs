/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  headers: async () => [
    {
      source: "/sw.js",
      headers: [
        {
          key: "Content-Type",
          value: "application/javascript; charset=utf-8",
        },
        {
          key: "Cache-Control",
          value: "no-cache, no-store, must-revalidate",
        },
        {
          key: "Service-Worker-Allowed",
          value: "/",
        },
      ],
    },
  ],
  rewrites: async () => [
    {
      source: "/farmbrain/:sub(analyze|overview|savings|history|recalculate)",
      destination: "/api/farmbrain/:sub",
    },
    {
      source: "/simulator/:sub(scenarios|compare)",
      destination: "/api/simulator/:sub",
    },
    {
      source: "/simulator/scenarios/:path*",
      destination: "/api/simulator/scenarios/:path*",
    },
    {
      source: "/predict/:path*",
      destination: "/api/predict/:path*",
    },
    {
      source: "/optimize/:path*",
      destination: "/api/optimize/:path*",
    },
    {
      source: "/simulate/:path*",
      destination: "/api/simulate/:path*",
    },
  ],
};

export default nextConfig;
