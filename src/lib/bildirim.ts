import { prisma } from "@/lib/prisma";

// Urune bagli OLMAYAN tek-kullanici bildirimi (ör. sikayet sonucu, admin
// duyurusu) - bildirimGonderTakipcilere/bildirimGonderMagazaTakipcilerine'nin
// aksine takip/favori sartina bakmaz, ne urunId gerektirir. hedefYolu
// opsiyonel: sikayet sonucu gibi belirli bir hedefe yonlendirmesi gereken
// bildirimler icin verilir (ör. "/sikayetlerim"); toplu duyuru gibi hedefsiz
// genel bildirimlerde BOS BIRAKILIR - /bildirimlerim boyle bir karti
// tiklanamaz gosterir (2026-07-08: onceden hepsi sabit /sikayetlerim'e
// gidiyordu, duyuru eklenince yanlis hedefe tiklamaya donustu).
export async function bildirimGonderKullaniciya(params: {
  kullaniciId: string;
  mesaj: string;
  hedefYolu?: string;
}): Promise<void> {
  await prisma.bildirim.create({
    data: { kullaniciId: params.kullaniciId, mesaj: params.mesaj, hedefYolu: params.hedefYolu },
  });
}

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

// bildirimGonderMagazaTakipcilerine ile AYNI iskelet, farkli alici kitlesi:
// takipciler DEGIL, o pazara bagli AKTIF (silindiMi=false, gizliMi=false)
// magazalarin sahipleri. Admin bir Pazar'i pasife alinca cagrilir (bkz.
// api/admin/pazar-guncelle/route.ts) - urunId'siz genel bildirim oldugu icin
// hedefYolu da verilmez (girisler zaten kapanacagi icin yonlendirilecek bir
// panel sayfasi yok).
export async function bildirimGonderPazarSaticilarina(params: {
  pazarId: string;
  pazarAdi: string;
  // Admin ayni zamanda o pazarda bir magazanin sahibi olabilir (magazaAc()
  // admin rolunu degistirmez, admin de satici olabilir - bkz. magaza.ts).
  // Eylemi yapan admin kendine bildirim almamali.
  haricKullaniciId: string;
}): Promise<void> {
  const saticilar = await prisma.magaza.findMany({
    where: {
      pazarId: params.pazarId,
      silindiMi: false,
      gizliMi: false,
      sahipId: { not: params.haricKullaniciId },
    },
    select: { sahipId: true },
  });
  if (saticilar.length === 0) return;

  await prisma.bildirim.createMany({
    data: saticilar.map((m) => ({
      kullaniciId: m.sahipId,
      mesaj: `Bağlı olduğun ${params.pazarAdi} pazarı artık aktif değil, panele giriş yapamayacaksın.`,
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
