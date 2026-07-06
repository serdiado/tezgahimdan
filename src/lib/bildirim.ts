import { prisma } from "@/lib/prisma";

// Rezervasyon motoruna (rezervasyon.ts) HIC import edilmez - motor cagrisi
// basariyla dondukten SONRA (kilit/transaction disinda), API route katmanindan
// cagrilir. Boylece motorun kritik-bolge (FOR UPDATE) suresi uzamaz.
export async function bildirimGonderTakipcilere(params: {
  urunId: string;
  mesaj: string;
  // Birden fazla kisi haric tutulabilir (ornegin: eylemi yapan kisi + varsa
  // ayni olayda kisisel bildirim alan yukselen kullanici) - cift/yaniltici
  // bildirimi onlemek icin bkz. bildirimGonderYukselenKullaniciya.
  haricKullaniciIdler: string[];
}): Promise<void> {
  const takipciler = await prisma.urunFavori.findMany({
    where: { urunId: params.urunId, takipMi: true, kullaniciId: { notIn: params.haricKullaniciIdler } },
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

// Belirli TEK bir kullaniciya (yedekten aktife yukselen kisi) kisisel bildirim
// gonderir - bildirimGonderTakipcilere'den farkli olarak takip/abonelik sartina
// bakilmaz (kullanicinin KENDI rezervasyon durumu degisti). yukselenKodu bir
// rezervKodu (schema.prisma'da @unique) - motor bunu zaten donduruyor, burada
// sadece aliciId'ye cozulur. Donen aliciId, caller'in genel takipci bildirimi
// cagrisinda ayni kisiyi hariç tutmasi icin kullanilir (cift bildirim onleme).
export async function bildirimGonderYukselenKullaniciya(params: {
  yukselenKodu: string;
  urunId: string;
  urunBaslik: string;
}): Promise<string | null> {
  const yukselen = await prisma.rezervasyon.findUnique({
    where: { rezervKodu: params.yukselenKodu },
    select: { aliciId: true },
  });
  if (!yukselen) {
    console.error(`bildirimGonderYukselenKullaniciya: rezervKodu bulunamadı: ${params.yukselenKodu}`);
    return null;
  }

  await prisma.bildirim.create({
    data: {
      kullaniciId: yukselen.aliciId,
      urunId: params.urunId,
      mesaj: `"${params.urunBaslik}" için sıra sana geldi, artık aktif hak sahibisin.`,
    },
  });
  return yukselen.aliciId;
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
