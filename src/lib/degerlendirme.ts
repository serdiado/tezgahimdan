import { prisma } from "@/lib/prisma";

// Degerlendirme: SADECE gercekten satin alanlar (Rezervasyon.durum="satildi"
// VE aliciId=kullanici) birakabilir - bu kural DB'de zorlanmaz, burada
// Rezervasyon.findFirst ile (salt-okunur) dogrulanir. Rezervasyon motoruna
// (rezervasyon.ts) HIC cagri yapilmaz.
export type DegerlendirmeUpsertSonucu =
  | { tur: "kaydedildi"; puan: number; yorum: string | null }
  | { tur: "satin-alinmadi" };

export async function degerlendirmeUpsert(params: {
  kullaniciId: string;
  urunId: string;
  puan: number;
  yorum?: string | null;
}): Promise<DegerlendirmeUpsertSonucu> {
  const satinAldiMi = await prisma.rezervasyon.findFirst({
    where: { urunId: params.urunId, aliciId: params.kullaniciId, durum: "satildi" },
    select: { id: true },
  });
  if (!satinAldiMi) return { tur: "satin-alinmadi" };

  const yorum = params.yorum?.trim() || null;
  const guncel = await prisma.degerlendirme.upsert({
    where: { kullaniciId_urunId: { kullaniciId: params.kullaniciId, urunId: params.urunId } },
    create: { kullaniciId: params.kullaniciId, urunId: params.urunId, puan: params.puan, yorum },
    update: { puan: params.puan, yorum },
  });

  return { tur: "kaydedildi", puan: guncel.puan, yorum: guncel.yorum };
}

// begeniSayilariHaritasi ile AYNI groupBy+Map deseni (N+1 onler).
export async function degerlendirmeOzetiHaritasi(
  urunIdler: string[],
): Promise<Map<string, { ortalama: number; sayi: number }>> {
  const harita = new Map<string, { ortalama: number; sayi: number }>();
  if (urunIdler.length === 0) return harita;

  const satirlar = await prisma.degerlendirme.groupBy({
    by: ["urunId"],
    where: { urunId: { in: urunIdler } },
    _avg: { puan: true },
    _count: true,
  });
  for (const satir of satirlar) {
    harita.set(satir.urunId, { ortalama: satir._avg.puan ?? 0, sayi: satir._count });
  }
  return harita;
}

// Formu "duzenleme" modunda onceden doldurmak icin - tekil sorgu (tek urun
// baglaminda, ör. detay modali).
export async function kullaniciDegerlendirmesi(
  kullaniciId: string,
  urunId: string,
): Promise<{ puan: number; yorum: string | null } | null> {
  const satir = await prisma.degerlendirme.findUnique({
    where: { kullaniciId_urunId: { kullaniciId, urunId } },
    select: { puan: true, yorum: true },
  });
  return satir;
}

// /rezervasyonum gibi coklu-urun listelerinde N+1 onlemek icin toplu sorgu +
// Map (kullaniciFavoriHaritasi ile ayni desen).
export async function kullaniciDegerlendirmeleriHaritasi(
  kullaniciId: string,
  urunIdler: string[],
): Promise<Map<string, { puan: number; yorum: string | null }>> {
  const harita = new Map<string, { puan: number; yorum: string | null }>();
  if (urunIdler.length === 0) return harita;
  const satirlar = await prisma.degerlendirme.findMany({
    where: { kullaniciId, urunId: { in: urunIdler } },
    select: { urunId: true, puan: true, yorum: true },
  });
  for (const satir of satirlar) harita.set(satir.urunId, { puan: satir.puan, yorum: satir.yorum });
  return harita;
}

export type YorumSatiri = { id: string; kullaniciAd: string; puan: number; yorum: string; createdAt: Date };

// Detay modalinda "yorum var mi" listesi icin - vitrin sayfalari (magaza
// sayfasi, ana sayfa) coklu urun listeledigi icin N+1 onlemek amaciyla TOPLU
// sorgu + Map (begeniSayilariHaritasi ile ayni desen). Yalniz yorum dolu
// satirlar, sayfalama YOK (kullaniciyla netlesen kapsam - urun basina yorum
// sayisi kucuk olacagi varsayimiyla tum liste cekilir).
export async function urunYorumlariHaritasi(urunIdler: string[]): Promise<Map<string, YorumSatiri[]>> {
  const harita = new Map<string, YorumSatiri[]>();
  if (urunIdler.length === 0) return harita;

  const satirlar = await prisma.degerlendirme.findMany({
    where: { urunId: { in: urunIdler }, yorum: { not: null } },
    select: {
      id: true,
      urunId: true,
      puan: true,
      yorum: true,
      createdAt: true,
      kullanici: { select: { ad: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  for (const s of satirlar) {
    if (s.yorum === null) continue;
    const liste = harita.get(s.urunId) ?? [];
    liste.push({ id: s.id, kullaniciAd: s.kullanici.ad, puan: s.puan, yorum: s.yorum, createdAt: s.createdAt });
    harita.set(s.urunId, liste);
  }
  return harita;
}

export type KullaniciUrunDegerlendirmesi = {
  id: string;
  urunId: string;
  urunBaslik: string;
  magazaAd: string;
  magazaSlug: string;
  puan: number;
  yorum: string | null;
  guncellenmeZamani: Date;
};

// "Ürün Değerlendirmelerim" sayfasi icin - kullanicinin YAPTIGI tum urun
// degerlendirmelerini (hangi urune, hangi magazaya ait oldugu bilgisiyle)
// TEK listede doner. urunIdler onceden bilinmedigi icin
// kullaniciDegerlendirmeleriHaritasi (belirli urunIdler ister) burada uygun
// degil - bu fonksiyon kullaniciId'ye gore DOGRUDAN sorgu yapar. Silinmis
// urunlerin degerlendirmesi (kayit HIC silinmez, sadece urun.silindiMi=true)
// listede DAHIL edilir ama "urun kaldirildi" notuyla - favorilerim'deki
// WHERE-ile-tamamen-filtreleme yerine burada gosterilmesi tercih edildi
// cunku kullanici KENDI gecmis degerlendirmesini gormek isteyebilir.
export async function kullaniciTumUrunDegerlendirmeleriGetir(
  kullaniciId: string,
): Promise<KullaniciUrunDegerlendirmesi[]> {
  const satirlar = await prisma.degerlendirme.findMany({
    where: { kullaniciId },
    select: {
      id: true,
      puan: true,
      yorum: true,
      guncellenmeZamani: true,
      urun: {
        select: {
          id: true,
          baslik: true,
          silindiMi: true,
          magaza: { select: { ad: true, slug: true } },
        },
      },
    },
    orderBy: { guncellenmeZamani: "desc" },
  });
  return satirlar.map((s) => ({
    id: s.id,
    urunId: s.urun.id,
    urunBaslik: s.urun.silindiMi ? `${s.urun.baslik} (kaldırıldı)` : s.urun.baslik,
    magazaAd: s.urun.magaza.ad,
    magazaSlug: s.urun.magaza.slug,
    puan: s.puan,
    yorum: s.yorum,
    guncellenmeZamani: s.guncellenmeZamani,
  }));
}

export type MagazaUrunYorumSatiri = YorumSatiri & { urunId: string; urunBaslik: string };

// `/magaza/[slug]/yorumlar` sayfasinin "Ürün Yorumları" sekmesi icin: bir
// magazanin TUM urunlerindeki yorumlari (hangi urun oldugu bilgisiyle birlikte)
// tek, kronolojik listede doner - urunYorumlariHaritasi'nin (urun-bazinda
// gruplu) aksine burada magaza-capinda DUZ bir liste isteniyor. silindiMi urun
// yorumlari HARIC tutulur (vitrin gorunurluk ilkesiyle tutarli); satildi/doldu
// urunlerin yorumlari DAHIL (gecmis satislarin da gorunmesi karari, bkz.
// magaza sayfasindaki 'satildi' urun degisikligi).
export async function magazaUrunYorumlariGetir(magazaId: string): Promise<MagazaUrunYorumSatiri[]> {
  const satirlar = await prisma.degerlendirme.findMany({
    where: { yorum: { not: null }, urun: { magazaId, silindiMi: false } },
    select: {
      id: true,
      puan: true,
      yorum: true,
      createdAt: true,
      kullanici: { select: { ad: true } },
      urun: { select: { id: true, baslik: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return satirlar
    .filter((s) => s.yorum !== null)
    .map((s) => ({
      id: s.id,
      kullaniciAd: s.kullanici.ad,
      puan: s.puan,
      yorum: s.yorum as string,
      createdAt: s.createdAt,
      urunId: s.urun.id,
      urunBaslik: s.urun.baslik,
    }));
}
