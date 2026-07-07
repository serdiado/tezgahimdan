import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/yetki";

const NOT_MAX_UZUNLUK = 500;

// Anlasmazliklar sayfasindaki (AP-6, salt-okunur triyaj) tek yazma istisnasi:
// DurumGecmisi.not alanina kisa bir aciklama eklemek/duzenlemek. Yalniz
// "geri_alma_reddedildi:" kaydina izin verilir - bu route DurumGecmisi'ni genel
// bir not-defteri haline getirmez, kapsam anlasmazlik triyajiyla sinirli.
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
  if (typeof body?.not !== "string") {
    return NextResponse.json({ hata: "not zorunlu" }, { status: 400 });
  }
  const not = body.not.trim().slice(0, NOT_MAX_UZUNLUK) || null;

  const kayit = await prisma.durumGecmisi.findUnique({ where: { id }, select: { id: true, olay: true } });
  if (!kayit || !kayit.olay.startsWith("geri_alma_reddedildi:")) {
    return NextResponse.json({ hata: "kayıt bulunamadı" }, { status: 404 });
  }

  await prisma.durumGecmisi.update({ where: { id }, data: { not } });

  return NextResponse.json({ tur: "guncellendi", not });
}
