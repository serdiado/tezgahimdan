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
  | "magaza_hero_puan"
  | "magaza_urun_listesi";

const VARSAYILAN_MODULLER: Record<SayfaAdi, { tur: ModulTuru; sira: number; ayarlar: SayfaModulAyarlari }[]> = {
  // Sira, platformun kesif zincirini izler (2026-07-15): hangi gun kuruluyor ->
  // KIM satiyor -> ne var. Tezgahlar eskiden EN ALTTAYDI (4.), yani zincirin
  // ikinci halkasi 24 urun kartinin altinda, mobilde ~6. ekranda kaliyordu.
  // Admin bu sirayi panelden degistirebilir; burasi yalnizca ilk kurulum.
  anasayfa: [
    { tur: "haftalik_ritim", sira: 1, ayarlar: {} },
    // ogeSayisi burada IKI ise yarar (2026-07-15): ana sayfadaki tezgah
    // onizlemesinin uzunlugu VE /magazalar sayfasinin sayfa boyu. Iki sayfa
    // zaten AYNI bileseni (MagazaVitrini) render ediyor, ayar da ortak.
    { tur: "magaza_listesi", sira: 2, ayarlar: { kolonSayisi: 3, ogeSayisi: 12 } },
    { tur: "yeni_urunler", sira: 3, ayarlar: { kolonSayisi: 3, sunumTipi: "grid", ogeSayisi: 12 } },
    { tur: "en_cok_begenilen", sira: 4, ayarlar: { kolonSayisi: 3, sunumTipi: "grid", ogeSayisi: 12 } },
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
    // Hero BILESENI DEGIL - tezgah sayfasinin urun listesi sayfa boyu
    // (2026-07-15). "magaza_hero" grubunda duruyor cunku admin'de o grubun
    // ekrani zaten "Tezgah Sayfasi Sablonu" basligiyla sunuluyor; ayri bir
    // sayfa degeri acmak tek modullu bir grup yaratir, sira/gorunurluk
    // kontrolleri karsiliksiz kalirdi. Hero dizilimine karismamasi icin
    // magaza/[slug] tarafinda "magaza_hero_" onekiyle suzuluyor.
    { tur: "magaza_urun_listesi", sira: 4, ayarlar: { ogeSayisi: 12 } },
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
  // "Grup BOS mu" degil "EKSIK mi" (2026-07-15). Eski kosul `length > 0` idi:
  // gruba SONRADAN yeni bir modul turu eklendiginde (ör. magaza_urun_listesi)
  // mevcut kurulumlarda satir hic olusmuyordu - yeni ayar prod'da hic
  // gorunmezdi, ama lokalde DB yeni resetlendigi icin fark edilmezdi.
  // skipDuplicates + @@unique([sayfa,tur]) sayesinde idempotent: her deploy
  // kendini iyilestirir, ayri bir veri migration'i gerekmez. Admin'in
  // sildigi/kapattigi satir DEGIL - kapatma aktifMi ile, silme yok.
  if (mevcutlar.length >= VARSAYILAN_MODULLER[sayfa].length) return mevcutlar;

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
