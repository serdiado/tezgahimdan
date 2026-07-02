import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import varsayilanPazarJson from "../../prisma/varsayilan-pazar.json";

const varsayilanPazar = varsayilanPazarJson as unknown as {
  ad: string;
  bolge: string;
  sifirlamaGunu: Prisma.PazarCreateInput["sifirlamaGunu"];
  sifirlamaSaati: string;
};

export function getOwnMagaza(userId: string) {
  return prisma.magaza.findFirst({ where: { sahipId: userId, silindiMi: false } });
}

// Henuz bir Pazar yonetim ekrani yok (bkz. prisma/seed.js); ayni varsayilan pazar
// burada da kullanilir, tek kaynak prisma/varsayilan-pazar.json.
export async function varsayilanPazariGetirVeyaOlustur() {
  const mevcut = await prisma.pazar.findFirst({ where: { ad: varsayilanPazar.ad } });
  if (mevcut) return mevcut;
  return prisma.pazar.create({
    data: { ...varsayilanPazar, sifirlamaSaati: new Date(varsayilanPazar.sifirlamaSaati) },
  });
}
