import { prisma } from "@/lib/prisma";
import { kullaniciYasakliMi } from "@/lib/yetki";

// Magaza-degerlendirme: Degerlendirme (urun-seviyesi) ile AYNI ilke - SADECE bu
// magazadan (HANGI urun olursa olsun) gercekten satin almis (Rezervasyon.durum
// ="satildi") kullanicilar birakabilir. Bu kural DB'de zorlanmaz, burada Urun
// uzerinden DOLAYLI join ile (Rezervasyon -> Urun.magazaId) dogrulanir.
export type MagazaDegerlendirmeUpsertSonucu =
  | { tur: "kaydedildi"; puan: number; yorum: string | null }
  | { tur: "satin-alinmadi" }
  | { tur: "yasakli" };

export async function magazaDegerlendirmeUpsert(params: {
  kullaniciId: string;
  magazaId: string;
  puan: number;
  yorum?: string | null;
}): Promise<MagazaDegerlendirmeUpsertSonucu> {
  if (await kullaniciYasakliMi(params.kullaniciId)) return { tur: "yasakli" };

  const satinAldiMi = await prisma.rezervasyon.findFirst({
    where: { aliciId: params.kullaniciId, durum: "satildi", urun: { magazaId: params.magazaId } },
    select: { id: true },
  });
  if (!satinAldiMi) return { tur: "satin-alinmadi" };

  const yorum = params.yorum?.trim() || null;
  const guncel = await prisma.magazaDegerlendirme.upsert({
    where: { kullaniciId_magazaId: { kullaniciId: params.kullaniciId, magazaId: params.magazaId } },
    create: { kullaniciId: params.kullaniciId, magazaId: params.magazaId, puan: params.puan, yorum },
    update: { puan: params.puan, yorum },
  });

  return { tur: "kaydedildi", puan: guncel.puan, yorum: guncel.yorum };
}

// Tekil magaza sayfasinda N+1 endisesi yok (tek magaza) - kullaniciMagazaTakipDurumu
// ile ayni desen, dogrudan groupBy yerine tekil sorgu.
export async function magazaDegerlendirmeOzeti(
  magazaId: string,
): Promise<{ ortalama: number; sayi: number }> {
  const sonuc = await prisma.magazaDegerlendirme.aggregate({
    where: { magazaId, gizliMi: false },
    _avg: { puan: true },
    _count: true,
  });
  return { ortalama: sonuc._avg.puan ?? 0, sayi: sonuc._count };
}

// Ana sayfadaki "Magazalar" gibi coklu-magaza listelerinde N+1 onlemek icin
// toplu sorgu - degerlendirmeOzetiHaritasi (urun-seviyesi) ile AYNI groupBy+
// Map deseni.
export async function magazaDegerlendirmeOzetiHaritasi(
  magazaIdler: string[],
): Promise<Map<string, { ortalama: number; sayi: number }>> {
  const harita = new Map<string, { ortalama: number; sayi: number }>();
  if (magazaIdler.length === 0) return harita;

  const satirlar = await prisma.magazaDegerlendirme.groupBy({
    by: ["magazaId"],
    where: { magazaId: { in: magazaIdler }, gizliMi: false },
    _avg: { puan: true },
    _count: true,
  });
  for (const satir of satirlar) {
    harita.set(satir.magazaId, { ortalama: satir._avg.puan ?? 0, sayi: satir._count });
  }
  return harita;
}

// /rezervasyonum gibi coklu-magaza listelerinde N+1 onlemek icin toplu sorgu +
// Map (kullaniciDegerlendirmeleriHaritasi ile ayni desen).
export async function kullaniciMagazaDegerlendirmeleriHaritasi(
  kullaniciId: string,
  magazaIdler: string[],
): Promise<Map<string, { puan: number; yorum: string | null }>> {
  const harita = new Map<string, { puan: number; yorum: string | null }>();
  if (magazaIdler.length === 0) return harita;
  const satirlar = await prisma.magazaDegerlendirme.findMany({
    where: { kullaniciId, magazaId: { in: magazaIdler } },
    select: { magazaId: true, puan: true, yorum: true },
  });
  for (const satir of satirlar) harita.set(satir.magazaId, { puan: satir.puan, yorum: satir.yorum });
  return harita;
}

export type KullaniciMagazaDegerlendirmesi = {
  id: string;
  magazaId: string;
  magazaAd: string;
  magazaSlug: string;
  puan: number;
  yorum: string | null;
  guncellenmeZamani: Date;
};

// "Mağaza Değerlendirmelerim" sayfasi icin - kullaniciTumUrunDegerlendirmeleriGetir
// (src/lib/degerlendirme.ts) ile AYNI desen, magaza-seviyesi karsiligi.
// Silinmis magazanin degerlendirmesi de listede DAHIL edilir ("magaza
// kaldirildi" notuyla) - kayit hic silinmez ilkesiyle tutarli.
export async function kullaniciTumMagazaDegerlendirmeleriGetir(
  kullaniciId: string,
): Promise<KullaniciMagazaDegerlendirmesi[]> {
  const satirlar = await prisma.magazaDegerlendirme.findMany({
    where: { kullaniciId },
    select: {
      id: true,
      puan: true,
      yorum: true,
      guncellenmeZamani: true,
      magaza: { select: { id: true, ad: true, slug: true, silindiMi: true } },
    },
    orderBy: { guncellenmeZamani: "desc" },
  });
  return satirlar.map((s) => ({
    id: s.id,
    magazaId: s.magaza.id,
    magazaAd: s.magaza.silindiMi ? `${s.magaza.ad} (kaldırıldı)` : s.magaza.ad,
    magazaSlug: s.magaza.slug,
    puan: s.puan,
    yorum: s.yorum,
    guncellenmeZamani: s.guncellenmeZamani,
  }));
}

export type MagazaYorumSatiri = { id: string; kullaniciAd: string; puan: number; yorum: string; createdAt: Date };

// Tekil magaza sayfasinda yorum listesi - urunYorumlariHaritasi'nin tekil-magaza
// karsiligi (N+1 endisesi yok, tek magaza sayfasi). `take` opsiyonel: magaza
// sayfasindaki hero'nun altinda "4 blok" onizleme icin (take:4), tum-yorumlar
// sayfasinda (`/magaza/[slug]/yorumlar`) limitsiz. Sayfalama YOK (yorum sayisi
// coksa "tum yorumlari gor" sayfasina yonlendirilir, o sayfada da sayfalama
// YOK - ayni "kucuk kalacagi varsayimi" kapsam karari, sadece tek liste yerine
// iki listeye (magaza/urun) bolunmus).
export async function magazaYorumlariGetir(
  magazaId: string,
  opsiyonlar?: { take?: number },
): Promise<MagazaYorumSatiri[]> {
  const satirlar = await prisma.magazaDegerlendirme.findMany({
    where: { magazaId, yorum: { not: null }, gizliMi: false },
    select: { id: true, puan: true, yorum: true, createdAt: true, kullanici: { select: { ad: true } } },
    orderBy: { createdAt: "desc" },
    take: opsiyonlar?.take,
  });
  return satirlar
    .filter((s) => s.yorum !== null)
    .map((s) => ({ id: s.id, kullaniciAd: s.kullanici.ad, puan: s.puan, yorum: s.yorum as string, createdAt: s.createdAt }));
}
