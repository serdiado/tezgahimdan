import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import varsayilanPazarJson from "../../prisma/varsayilan-pazar.json";

const varsayilanPazar = varsayilanPazarJson as unknown as {
  ad: string;
  bolge: string;
  baslangicGunu: Prisma.PazarCreateInput["baslangicGunu"];
  baslangicSaati: string;
  sifirlamaGunu: Prisma.PazarCreateInput["sifirlamaGunu"];
  sifirlamaSaati: string;
};

export function getOwnMagaza(userId: string) {
  return prisma.magaza.findFirst({ where: { sahipId: userId, silindiMi: false } });
}

// Vitrin (herkese acik) magaza sayfasi icin - slug tekil oldugu icin en fazla 1
// sonuc bekleriz, ama findUnique tek basina ek (silindiMi) filtresi almadigindan
// findFirst kullaniyoruz. Hero bandinda pazar bilgisini gosterebilmek icin
// pazar iliskisini de dahil ediyoruz.
export function getMagazaBySlug(slug: string) {
  return prisma.magaza.findFirst({ where: { slug, silindiMi: false }, include: { pazar: true } });
}

// Henuz bir Pazar yonetim ekrani yok (bkz. prisma/seed.js); ayni varsayilan pazar
// burada da kullanilir, tek kaynak prisma/varsayilan-pazar.json.
export async function varsayilanPazariGetirVeyaOlustur() {
  const mevcut = await prisma.pazar.findFirst({ where: { ad: varsayilanPazar.ad } });
  if (mevcut) return mevcut;
  return prisma.pazar.create({
    data: {
      ...varsayilanPazar,
      baslangicSaati: new Date(varsayilanPazar.baslangicSaati),
      sifirlamaSaati: new Date(varsayilanPazar.sifirlamaSaati),
    },
  });
}
