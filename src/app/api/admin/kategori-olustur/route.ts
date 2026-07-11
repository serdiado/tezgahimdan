import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/yetki";

export async function POST(request: Request) {
  const { session, yetkili } = await getAdminSession();
  if (!yetkili || !session) {
    return NextResponse.json({ hata: "yetkisiz" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const ad = typeof body?.ad === "string" ? body.ad.trim() : "";
  if (!ad || ad.length > 50) {
    return NextResponse.json({ hata: "kategori adı zorunlu (en fazla 50 karakter)" }, { status: 400 });
  }

  // Kategori.ad DB'de unique degil - ayni isimle yanlislikla iki kez olusturmayi
  // (or. cift tiklama) uygulama katmaninda onlemek icin buyuk/kucuk harf
  // duyarsiz kontrol. Kaldirilmis (silindiMi=true) kategoriyle isim carpismasi
  // engellenmez - o zaten "Geri Getir" ile geri gelebilir, farkli bir kayittir.
  const cakisan = await prisma.kategori.findFirst({
    where: { ad: { equals: ad, mode: "insensitive" }, silindiMi: false },
    select: { id: true },
  });
  if (cakisan) {
    return NextResponse.json({ hata: "bu isimde bir kategori zaten var" }, { status: 409 });
  }

  const kategori = await prisma.$transaction(async (tx) => {
    // Yeni kategori dizilimin SONUNA eklenir: mevcut en buyuk sira + 1. Bilincli
    // siralama (Kategori.sira) korunur; yeni oge "Diger" gibi son ogeden de sonra
    // gelir - manuel reorder UI'si Faz 2 (bkz. schema.prisma Kategori.sira notu).
    const enBuyuk = await tx.kategori.aggregate({ _max: { sira: true } });
    const yeni = await tx.kategori.create({ data: { ad, sira: (enBuyuk._max.sira ?? 0) + 1 } });
    await tx.durumGecmisi.create({
      data: {
        kullaniciId: session.user.id,
        varlikTuru: "Kategori",
        varlikId: yeni.id,
        olay: "kategori_olusturuldu",
      },
    });
    return yeni;
  });

  return NextResponse.json({ id: kategori.id }, { status: 201 });
}
