import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Ayni Wi-Fi agindaki telefon/tablet gibi cihazlardan dev sunucusuna
  // erisim icin (Next.js 15.3+ cross-origin dev istegini varsayilan engeller).
  allowedDevOrigins: ["192.168.1.145"],
  // Docker production build: standalone çıktı (Dockerfile'ın runner
  // aşaması sadece bunu + public/static'i kopyalar). Prisma'nın generator
  // çıktısı varsayılan node_modules/.prisma DEĞİL, özel bir konum
  // (src/generated/prisma - bkz. schema.prisma) - standalone dosya izleyici
  // (@vercel/nft) query-engine binary'sini dinamik yükleme oldugu icin
  // otomatik yakalamayabilir, bu yuzden acikca dahil ediyoruz.
  output: "standalone",
  outputFileTracingIncludes: {
    "/*": ["./src/generated/prisma/**/*"],
  },
};

export default nextConfig;
