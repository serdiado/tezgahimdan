import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

export type SayfaModulAyarlari = {
  kolonSayisi?: 3 | 4;
  sunumTipi?: "grid" | "slider";
  ogeSayisi?: number;
};

type SayfaAdi = "anasayfa" | "magaza_hero";
type ModulTuru =
  | "haftalik_ritim"
  | "yeni_urunler"
  | "en_cok_begenilen"
  | "magaza_listesi"
  | "magaza_hero_whatsapp"
  | "magaza_hero_kroki"
  | "magaza_hero_puan";

const VARSAYILAN_MODULLER: Record<SayfaAdi, { tur: ModulTuru; sira: number; ayarlar: SayfaModulAyarlari }[]> = {
  anasayfa: [
    { tur: "haftalik_ritim", sira: 1, ayarlar: {} },
    { tur: "yeni_urunler", sira: 2, ayarlar: { kolonSayisi: 3, sunumTipi: "grid", ogeSayisi: 12 } },
    { tur: "en_cok_begenilen", sira: 3, ayarlar: { kolonSayisi: 3, sunumTipi: "grid", ogeSayisi: 12 } },
    { tur: "magaza_listesi", sira: 4, ayarlar: { kolonSayisi: 3 } },
  ],
  // Mevcut MagazaHero.tsx dizilimiyle birebir ayni sira (WhatsApp -> kroki),
  // puan rozeti (YildizGosterge) Hero'nun DISINDA (page.tsx'te takip
  // butonunun yaninda) render edildigi icin varsayilan olarak PASIF baslar -
  // admin isterse acar (bkz. Faz 4.2 kullanici sorusu: "gorunurluk" de
  // ayarlanabilir olmali).
  magaza_hero: [
    { tur: "magaza_hero_whatsapp", sira: 1, ayarlar: {} },
    { tur: "magaza_hero_kroki", sira: 2, ayarlar: {} },
    { tur: "magaza_hero_puan", sira: 3, ayarlar: {} },
  ],
};

// getOwnMagaza/getMagazaBySlug ile AYNI find-or-seed felsefesindeki bir desen
// (bkz. lib/magaza.ts), TEK satir yerine sabit bir liste tohumlar. sayfa parametresi AYNI
// tabloyu birden fazla baglamda (anasayfa, magaza Hero) kullanmayi saglar -
// her cagri kendi grubunun sira sayacinda kalir. skipDuplicates: ilk
// yuklemede es zamanli iki istek ayni anda bos grubu tohumlamaya calisirsa
// (Faz 4.1'de canli testte yakalanan P2002 yarisiyla ayni risk) sessizce
// atlanir.
export async function sayfaModulleriGetir(sayfa: SayfaAdi) {
  const mevcutlar = await prisma.sayfaModulu.findMany({ where: { sayfa }, orderBy: { sira: "asc" } });
  if (mevcutlar.length > 0) return mevcutlar;

  await prisma.sayfaModulu.createMany({
    data: VARSAYILAN_MODULLER[sayfa].map((m) => ({
      sayfa,
      tur: m.tur,
      sira: m.sira,
      ayarlar: m.ayarlar as Prisma.InputJsonValue,
    })),
    skipDuplicates: true,
  });
  return prisma.sayfaModulu.findMany({ where: { sayfa }, orderBy: { sira: "asc" } });
}
