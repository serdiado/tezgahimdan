import { prisma } from "@/lib/prisma";

export type DuyuruYayinlaSonucu =
  | { tur: "yayinlandi"; gonderilenSayisi: number }
  | { tur: "zaten-yayinda" }
  | { tur: "bulunamadi" }
  | { tur: "hedef-bos" };

// Bir taslak duyuruyu yayinlar: hedef kitleye Bildirim POINTER'lari uretir
// (mesaj=baslik, duyuruId=pointer - govde Duyuru'da yasar), Duyuru'yu yayinlandi
// isaretler. IDEMPOTENT: kosullu updateMany (yayinlandiMi=false) kilit gorevi
// gorur - iki es zamanli "Yayinla" tiklamasindan sadece biri fan-out yapar,
// cift bildirim olmaz. Fan-out + isaretleme + audit tek transaction'da.
// hedefKitle "hepsi" -> satici+alici (admin haric, mevcut duyuru-gonder ile ayni).
export async function duyuruYayinla(duyuruId: string, adminId: string): Promise<DuyuruYayinlaSonucu> {
  const duyuru = await prisma.duyuru.findFirst({
    where: { id: duyuruId, silindiMi: false },
    select: { id: true, baslik: true, hedefKitle: true, yayinlandiMi: true },
  });
  if (!duyuru) return { tur: "bulunamadi" };
  if (duyuru.yayinlandiMi) return { tur: "zaten-yayinda" };

  const rolFiltre =
    duyuru.hedefKitle === "hepsi"
      ? { in: ["satici", "alici"] as ("satici" | "alici")[] }
      : (duyuru.hedefKitle as "satici" | "alici");
  const aliciKullanicilar = await prisma.kullanici.findMany({
    where: { rol: rolFiltre },
    select: { id: true },
  });
  if (aliciKullanicilar.length === 0) return { tur: "hedef-bos" };

  const simdi = new Date();
  return prisma.$transaction(async (tx): Promise<DuyuruYayinlaSonucu> => {
    // Kosullu isaretleme = kilit: yalniz taslaksa yayinlar (idempotent).
    const guard = await tx.duyuru.updateMany({
      where: { id: duyuru.id, yayinlandiMi: false },
      data: { yayinlandiMi: true, yayinTarihi: simdi, gonderilenSayisi: aliciKullanicilar.length },
    });
    if (guard.count === 0) return { tur: "zaten-yayinda" };

    await tx.bildirim.createMany({
      data: aliciKullanicilar.map((k) => ({ kullaniciId: k.id, mesaj: duyuru.baslik, duyuruId: duyuru.id })),
    });
    await tx.durumGecmisi.create({
      data: {
        kullaniciId: adminId,
        varlikTuru: "Duyuru",
        varlikId: duyuru.id,
        olay: `duyuru_yayinlandi:${duyuru.hedefKitle}:${aliciKullanicilar.length}`,
      },
    });
    return { tur: "yayinlandi", gonderilenSayisi: aliciKullanicilar.length };
  });
}

// Admin listesi icin okunma istatistigi: bir duyurunun pointer'lari kac kisi
// tarafindan okundu (silinmemis + okunmus Bildirim). gonderilenSayisi Duyuru'da
// zaten saklı; bu sadece "okunan" tarafini canli sayar.
export async function duyuruOkunmaSayisi(duyuruId: string): Promise<number> {
  return prisma.bildirim.count({
    where: { duyuruId, okunduMu: true, silindiMi: false },
  });
}
