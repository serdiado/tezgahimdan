import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Ayni Wi-Fi agindaki telefon/tablet gibi cihazlardan dev sunucusuna
  // erisim icin (Next.js 15.3+ cross-origin dev istegini varsayilan engeller).
  allowedDevOrigins: ["192.168.1.145"],
};

export default nextConfig;
