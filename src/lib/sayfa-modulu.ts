import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

export type SayfaModulAyarlari = {
  kolonSayisi?: 3 | 4;
  sunumTipi?: "grid" | "slider";
  ogeSayisi?: number;
};

const VARSAYILAN_MODULLER: {
  tur: "haftalik_ritim" | "yeni_urunler" | "en_cok_begenilen" | "magaza_listesi";
  sira: number;
  ayarlar: SayfaModulAyarlari;
}[] = [
  { tur: "haftalik_ritim", sira: 1, ayarlar: {} },
  { tur: "yeni_urunler", sira: 2, ayarlar: { kolonSayisi: 3, sunumTipi: "grid", ogeSayisi: 12 } },
  { tur: "en_cok_begenilen", sira: 3, ayarlar: { kolonSayisi: 3, sunumTipi: "grid", ogeSayisi: 12 } },
  { tur: "magaza_listesi", sira: 4, ayarlar: { kolonSayisi: 3 } },
];

// varsayilanPazariGetirVeyaOlustur (lib/magaza.ts) ile AYNI "find-or-seed"
// deseni, TEK satir yerine sabit bir liste tohumlar. Anasayfa (src/app/
// page.tsx) HER istekte bunu cagirir - sira/aktifMi/ayarlar hep buradan okunur.
// skipDuplicates: ilk yuklemede es zamanli iki istek ayni anda bos tabloyu
// gorup ikisi de tohumlamaya calisabilir (React/Next dev modunda cift render
// dahil) - tur @unique oldugu icin ikinci istek P2002 ile patlardi, bunun
// yerine sessizce atlanir (canli testte yakalandi).
export async function sayfaModulleriGetir() {
  const mevcutlar = await prisma.sayfaModulu.findMany({ orderBy: { sira: "asc" } });
  if (mevcutlar.length > 0) return mevcutlar;

  await prisma.sayfaModulu.createMany({
    data: VARSAYILAN_MODULLER.map((m) => ({
      tur: m.tur,
      sira: m.sira,
      ayarlar: m.ayarlar as Prisma.InputJsonValue,
    })),
    skipDuplicates: true,
  });
  return prisma.sayfaModulu.findMany({ orderBy: { sira: "asc" } });
}
