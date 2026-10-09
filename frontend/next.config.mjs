/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["three"],
  // Proxy API calls to the Express backend so the frontend and API share one origin.
  // The browser hits "/api/..." (relative); Next forwards it to localhost:4000, which
  // runs on the same machine as Next — so a single tunnel of port 3000 serves everything.
  // The public Pricing page was removed (owner, 9 Oct 2026); old links go to the home page.
  async redirects() {
    return [{ source: "/pricing", destination: "/", permanent: false }];
  },
  async rewrites() {
    const apiBase = process.env.BACKEND_URL || "http://localhost:4000";
    return [{ source: "/api/:path*", destination: `${apiBase}/api/:path*` }];
  },
};

export default nextConfig;
