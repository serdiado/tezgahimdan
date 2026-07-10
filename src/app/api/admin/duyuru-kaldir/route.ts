import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/yetki";

// Duyuruyu yayindan kaldirir (soft-delete: silindiMi=true). Kalici silme YOK.
// Detay sayfasi (/duyuru/[id]) ve admin listesi silindiMi=false filtreler -
// yayinlanmis bir duyuru kaldirilirsa dagitilmis Bildirim pointer'lari kalir
// ama tiklaninca 404 doner (kabul edilen sinir, kaldirma nadir bir islem).
export async function POST(request: Request) {
  const { session, yetkili } = await getAdminSession();
  if (!yetkili || !session) {
    return NextResponse.json({ hata: "yetkisiz" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) {
    return NextResponse.json({ hata: "id zorunlu" }, { status: 400 });
  }

  const mevcut = await prisma.duyuru.findFirst({ where: { id, silindiMi: false }, select: { id: true } });
  if (!mevcut) {
    return NextResponse.json({ hata: "duyuru bulunamadı" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.duyuru.update({ where: { id }, data: { silindiMi: true } }),
    prisma.durumGecmisi.create({
      data: { kullaniciId: session.user.id, varlikTuru: "Duyuru", varlikId: id, olay: "duyuru_kaldirildi" },
    }),
  ]);
  return NextResponse.json({ tur: "kaldirildi" });
}
