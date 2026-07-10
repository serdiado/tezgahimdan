import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/yetki";

// Kalici muafiyet DEGIL: Kullanici.guvenilirlikSifirlamaTarihi'ni simdiki
// zamana yazar VE varsa aktif gelmedi yasagini kaldirir (2026-07-10: af,
// hem seriyi hem yasagi temizler). gelmediYasagiKontrolEt bu tarihten SONRAKI
// kayitlara bakar - kullanici yeniden ust uste seri doldurursa yasak tekrar
// devreye girer. AP-6 tarzi tek yonlu islem: "geri alma" yok, tekrar
// gerekirse admin yeniden sifirlar (tarih guncellenir).
export async function POST(request: Request) {
  const { session, yetkili } = await getAdminSession();
  if (!yetkili || !session) {
    return NextResponse.json({ hata: "yetkisiz" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const kullaniciId = typeof body?.kullaniciId === "string" ? body.kullaniciId : "";
  if (!kullaniciId) {
    return NextResponse.json({ hata: "kullaniciId zorunlu" }, { status: 400 });
  }

  const kullanici = await prisma.kullanici.findUnique({ where: { id: kullaniciId }, select: { id: true } });
  if (!kullanici) {
    return NextResponse.json({ hata: "kullanıcı bulunamadı" }, { status: 404 });
  }

  const simdi = new Date();
  await prisma.$transaction([
    prisma.kullanici.update({
      where: { id: kullaniciId },
      data: { guvenilirlikSifirlamaTarihi: simdi, rezervasyonYasagiBitisi: null },
    }),
    prisma.durumGecmisi.create({
      data: {
        kullaniciId: session.user.id,
        varlikTuru: "Kullanici",
        varlikId: kullaniciId,
        olay: "guvenilirlik_sifirlandi",
      },
    }),
  ]);

  return NextResponse.json({ tur: "guncellendi", guvenilirlikSifirlamaTarihi: simdi.toISOString() });
}
