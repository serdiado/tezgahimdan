import { prisma } from "@/lib/prisma";

// MagazaTakip: UrunFavori'den AYRI tablo (bkz. prisma/schema.prisma) - farkli
// varlik (Magaza), begeniMi karsiligi yok, tek bayrak. Tek kullanicinin kendi
// satiri oldugu icin kilide gerek yok (rezervasyon motorundaki gibi paylasilan
// kapasite yarisi yok).

export type MagazaTakipToggleSonucu = { takipMi: boolean };

export async function magazaTakipToggle(params: {
  kullaniciId: string;
  magazaId: string;
}): Promise<MagazaTakipToggleSonucu> {
  const mevcut = await prisma.magazaTakip.findUnique({
    where: { kullaniciId_magazaId: { kullaniciId: params.kullaniciId, magazaId: params.magazaId } },
  });
  const yeniDeger = !(mevcut?.takipMi ?? false);

  const guncel = await prisma.magazaTakip.upsert({
    where: { kullaniciId_magazaId: { kullaniciId: params.kullaniciId, magazaId: params.magazaId } },
    create: { kullaniciId: params.kullaniciId, magazaId: params.magazaId, takipMi: yeniDeger },
    update: { takipMi: yeniDeger },
  });

  return { takipMi: guncel.takipMi };
}

// Tekil magaza sayfasinda N+1 endisesi yok (tek magaza) - toplu Map yerine
// dogrudan findUnique yeterli.
export async function kullaniciMagazaTakipDurumu(
  kullaniciId: string | null | undefined,
  magazaId: string,
): Promise<boolean> {
  if (!kullaniciId) return false;
  const satir = await prisma.magazaTakip.findUnique({
    where: { kullaniciId_magazaId: { kullaniciId, magazaId } },
    select: { takipMi: true },
  });
  return satir?.takipMi ?? false;
}

export type TakipEdilenMagaza = {
  id: string;
  ad: string;
  slug: string;
  aciklama: string | null;
  pazarAd: string;
  urunSayisi: number;
};

// "Takip Ettigim Magazalar" sayfasi icin - ana sayfadaki (src/app/page.tsx)
// magaza karti veri sekliyle AYNI (urunSayisi icin _count, degerlendirme
// ozeti ayri magazaDegerlendirmeOzetiHaritasi cagrisiyla sayfa tarafinda
// eklenir - burada DEGIL, cunku bu fonksiyon magaza-takip domain'inde,
// degerlendirme domain'ine bagimli olmamali).
export async function kullaniciTakipEttigiMagazalarGetir(
  kullaniciId: string,
): Promise<TakipEdilenMagaza[]> {
  const satirlar = await prisma.magazaTakip.findMany({
    where: { kullaniciId, takipMi: true, magaza: { silindiMi: false, gizliMi: false } },
    select: {
      magaza: {
        select: {
          id: true,
          ad: true,
          slug: true,
          aciklama: true,
          pazar: { select: { ad: true } },
          _count: { select: { urunler: { where: { silindiMi: false } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return satirlar.map((s) => ({
    id: s.magaza.id,
    ad: s.magaza.ad,
    slug: s.magaza.slug,
    aciklama: s.magaza.aciklama,
    pazarAd: s.magaza.pazar.ad,
    urunSayisi: s.magaza._count.urunler,
  }));
}
