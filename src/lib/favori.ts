import { prisma } from "@/lib/prisma";

// UrunFavori: kalp/begeni (begeniMi) ve favori/takip (takipMi) AYNI satirda iki
// bagimsiz bayrak (bkz. prisma/schema.prisma). Tek kullanicinin kendi satiri
// oldugu icin rezervasyon motorundaki gibi paylasilan kapasite yarisi yok -
// kilide gerek yok.

export type FavoriToggleSonucu = { begeniMi: boolean; takipMi: boolean; begeniSayisi: number };

export async function favoriToggle(params: {
  kullaniciId: string;
  urunId: string;
  tur: "begeni" | "takip";
}): Promise<FavoriToggleSonucu> {
  const alan = params.tur === "begeni" ? "begeniMi" : "takipMi";
  const mevcut = await prisma.urunFavori.findUnique({
    where: { kullaniciId_urunId: { kullaniciId: params.kullaniciId, urunId: params.urunId } },
  });
  const yeniDeger = !(mevcut?.[alan] ?? false);

  const guncel = await prisma.urunFavori.upsert({
    where: { kullaniciId_urunId: { kullaniciId: params.kullaniciId, urunId: params.urunId } },
    create: { kullaniciId: params.kullaniciId, urunId: params.urunId, [alan]: yeniDeger },
    update: { [alan]: yeniDeger },
  });

  const begeniSayisi = await prisma.urunFavori.count({
    where: { urunId: params.urunId, begeniMi: true },
  });

  return { begeniMi: guncel.begeniMi, takipMi: guncel.takipMi, begeniSayisi };
}

// Bir urun listesi render edilirken N+1 sorgu yerine TEK toplu sorgu + Map
// (aliciGuvenilirlikHaritasi ile ayni desen, bkz. rezervasyon.ts).
export async function kullaniciFavoriHaritasi(
  kullaniciId: string | null | undefined,
  urunIdler: string[],
): Promise<Map<string, { begeniMi: boolean; takipMi: boolean }>> {
  const harita = new Map<string, { begeniMi: boolean; takipMi: boolean }>();
  if (!kullaniciId || urunIdler.length === 0) return harita;

  const satirlar = await prisma.urunFavori.findMany({
    where: { kullaniciId, urunId: { in: urunIdler } },
    select: { urunId: true, begeniMi: true, takipMi: true },
  });
  for (const satir of satirlar) {
    harita.set(satir.urunId, { begeniMi: satir.begeniMi, takipMi: satir.takipMi });
  }
  return harita;
}

// Begeni sayisi HERKESE ACIK (girissiz ziyaretciye de) gosterilir - kullanici
// karari, bkz. plan dosyasi.
export async function begeniSayilariHaritasi(urunIdler: string[]): Promise<Map<string, number>> {
  const harita = new Map<string, number>();
  if (urunIdler.length === 0) return harita;

  const satirlar = await prisma.urunFavori.groupBy({
    by: ["urunId"],
    where: { urunId: { in: urunIdler }, begeniMi: true },
    _count: true,
  });
  for (const satir of satirlar) harita.set(satir.urunId, satir._count);
  return harita;
}

// En cok begenilen (begeniMi:true sayisi en yuksek) N urunun id'sini, SIRAYLA
// dondurur - Prisma'nin groupBy+orderBy:{_count} destegi (resmi, tahmin degil).
// GORUNURLUK FILTRESI (silindiMi/durum/magaza.gizliMi) UYGULAMAZ - sadece
// begeni sayisina gore ID sirasi doner, cagiran taraf (page.tsx) kendi
// gorunurluk filtresini eklemeli (ayni "Bu Hafta Eklenenler" sorgusundaki gibi).
export async function enCokBegenilenUrunIdleriGetir(limit: number): Promise<string[]> {
  const gruplar = await prisma.urunFavori.groupBy({
    by: ["urunId"],
    where: { begeniMi: true },
    _count: true,
    orderBy: { _count: { urunId: "desc" } },
    take: limit,
  });
  return gruplar.map((g) => g.urunId);
}
