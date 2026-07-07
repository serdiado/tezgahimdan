import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/yetki";

const YANIT_MAX_UZUNLUK = 500;

// Sikayet.durum degisiminden BAGIMSIZ: admin herhangi bir asamada (inceleniyor
// iken bile) sikayetciye kisa bir yanit yazabilir/duzenleyebilir. Yanit
// /sikayetlerim'de (bkz. src/lib/sikayet.ts) sikayetciye gosterilir.
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
  if (typeof body?.yanit !== "string") {
    return NextResponse.json({ hata: "yanit zorunlu" }, { status: 400 });
  }
  const yanit = body.yanit.trim().slice(0, YANIT_MAX_UZUNLUK) || null;

  const sikayet = await prisma.sikayet.findUnique({ where: { id }, select: { id: true } });
  if (!sikayet) {
    return NextResponse.json({ hata: "şikayet bulunamadı" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.sikayet.update({ where: { id }, data: { yanit } }),
    prisma.durumGecmisi.create({
      data: {
        kullaniciId: session.user.id,
        varlikTuru: "Sikayet",
        varlikId: id,
        olay: "sikayet_yanitlandi",
      },
    }),
  ]);

  return NextResponse.json({ tur: "guncellendi", yanit });
}
