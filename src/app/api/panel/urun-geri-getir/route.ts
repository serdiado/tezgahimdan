import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSaticiSession } from "@/lib/yetki";
import { getOwnMagaza } from "@/lib/magaza";

export async function POST(request: Request) {
  const { session, yetkili } = await getSaticiSession();
  if (!yetkili || !session) {
    return NextResponse.json({ hata: "yetkisiz" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) {
    return NextResponse.json({ hata: "id zorunlu" }, { status: 400 });
  }

  const magaza = await getOwnMagaza(session.user.id);
  if (!magaza) {
    return NextResponse.json({ hata: "once magaza olusturulmali" }, { status: 409 });
  }

  const urun = await prisma.urun.findUnique({ where: { id }, select: { id: true, magazaId: true } });
  if (!urun) {
    return NextResponse.json({ hata: "urun bulunamadi" }, { status: 404 });
  }
  if (urun.magazaId !== magaza.id) {
    return NextResponse.json({ hata: "bu urun sizin magazaniza ait degil" }, { status: 403 });
  }

  await prisma.urun.update({ where: { id }, data: { silindiMi: false } });
  return NextResponse.json({ tur: "geri-getirildi" });
}
