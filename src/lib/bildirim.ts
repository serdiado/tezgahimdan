import { prisma } from "@/lib/prisma";

// Rezervasyon motoruna (rezervasyon.ts) HIC import edilmez - motor cagrisi
// basariyla dondukten SONRA (kilit/transaction disinda), API route katmanindan
// cagrilir. Boylece motorun kritik-bolge (FOR UPDATE) suresi uzamaz.
export async function bildirimGonderTakipcilere(params: {
  urunId: string;
  mesaj: string;
  haricKullaniciId: string;
}): Promise<void> {
  const takipciler = await prisma.urunFavori.findMany({
    where: { urunId: params.urunId, takipMi: true, kullaniciId: { not: params.haricKullaniciId } },
    select: { kullaniciId: true },
  });
  if (takipciler.length === 0) return;

  await prisma.bildirim.createMany({
    data: takipciler.map((t) => ({
      kullaniciId: t.kullaniciId,
      urunId: params.urunId,
      mesaj: params.mesaj,
    })),
  });
}

// bildirimGonderTakipcilere ile AYNI iskelet, farkli kaynak tablo (MagazaTakip
// vs UrunFavori) - genel parametrik bir fonksiyon yerine kucuk, acik bir ikiz
// (projenin sadelik ilkesiyle tutarli). Bildirim.urunId zorunlu oldugu icin
// (yeni eklenen urunun id'si) urunId burada da parametre olarak alinir.
export async function bildirimGonderMagazaTakipcilerine(params: {
  magazaId: string;
  urunId: string;
  mesaj: string;
  haricKullaniciId: string;
}): Promise<void> {
  const takipciler = await prisma.magazaTakip.findMany({
    where: { magazaId: params.magazaId, takipMi: true, kullaniciId: { not: params.haricKullaniciId } },
    select: { kullaniciId: true },
  });
  if (takipciler.length === 0) return;

  await prisma.bildirim.createMany({
    data: takipciler.map((t) => ({
      kullaniciId: t.kullaniciId,
      urunId: params.urunId,
      mesaj: params.mesaj,
    })),
  });
}
