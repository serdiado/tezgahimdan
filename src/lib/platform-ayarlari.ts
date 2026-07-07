import { prisma } from "@/lib/prisma";

export const PLATFORM_AYARLARI_ID = "singleton";

// varsayilanPazariGetirVeyaOlustur() (lib/magaza.ts) ile AYNI find-or-create
// deseni. Motor (rezervasyon.ts) bu degerleri HER rezervasyonOlustur/
// rezervasyonGeriAl cagrisinda kilit ONCESI okur - yasakliMi/guvenilirlik
// sifirlama on-kontrolleriyle AYNI konum/gerekce (tek satirlik, sik
// degismeyen global config, kilit gerektirmez).
export async function platformAyarlariGetir() {
  const mevcut = await prisma.platformAyarlari.findUnique({ where: { id: PLATFORM_AYARLARI_ID } });
  if (mevcut) return mevcut;
  return prisma.platformAyarlari.create({ data: { id: PLATFORM_AYARLARI_ID } });
}
