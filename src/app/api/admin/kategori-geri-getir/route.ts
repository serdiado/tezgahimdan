import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/yetki";

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

  const kategori = await prisma.kategori.findUnique({ where: { id }, select: { id: true } });
  if (!kategori) {
    return NextResponse.json({ hata: "kategori bulunamadı" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.kategori.update({ where: { id }, data: { silindiMi: false } }),
    prisma.durumGecmisi.create({
      data: {
        kullaniciId: session.user.id,
        varlikTuru: "Kategori",
        varlikId: id,
        olay: "kategori_geri_getirildi",
      },
    }),
  ]);

  return NextResponse.json({ tur: "geri-getirildi" });
}
