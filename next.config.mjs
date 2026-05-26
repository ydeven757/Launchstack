/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone", // for slim Docker images
  experimental: {
    serverActions: { bodySizeLimit: "5mb" },
  },
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
};

export default nextConfig;
