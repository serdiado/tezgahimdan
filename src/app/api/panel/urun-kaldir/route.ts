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

  // Ayni kilit stratejisi (urun satirinda FOR UPDATE): kaldirma ile es zamanli
  // gelen bir rezervasyon/vazgec/sonuclandirma kuyrugu bu esnada degistiremesin.
  const sonuc = await prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Urun" WHERE "id" = ${id} FOR UPDATE`;

      const bekleyenSayisi = await tx.rezervasyon.count({
        where: { urunId: id, durum: "bekliyor" },
      });
      if (bekleyenSayisi > 0) {
        return { tur: "bekleyen-var" as const, sayi: bekleyenSayisi };
      }

      await tx.urun.update({ where: { id }, data: { silindiMi: true } });
      return { tur: "kaldirildi" as const };
    },
    { maxWait: 5000, timeout: 15000 },
  );

  if (sonuc.tur === "bekleyen-var") {
    return NextResponse.json(
      {
        hata: `bu urunde ${sonuc.sayi} bekleyen rezervasyon var, once bunlar sonuclanmali`,
        bekleyenSayisi: sonuc.sayi,
      },
      { status: 409 },
    );
  }
  return NextResponse.json({ tur: "kaldirildi" });
}
