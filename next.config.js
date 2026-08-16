/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "@react-pdf/renderer", "docx"],
  },
};
module.exports = nextConfig;
