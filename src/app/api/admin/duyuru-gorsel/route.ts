import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/yetki";
import { duyuruGorselGuncelle, duyuruGorselKaldir } from "@/lib/duyuru-gorsel";

// pazar-gorsel route'u ile ayni desen (admin yetkisi -> formData ->
// magic-number dogrulamali kayit -> DurumGecmisi izi). Duyuru tek gorsel
// alani (gorselUrl) tasidigi icin alan whitelist'i gerekmiyor.
export async function POST(request: Request) {
  const { session, yetkili } = await getAdminSession();
  if (!yetkili || !session) {
    return NextResponse.json({ hata: "yetkisiz" }, { status: 403 });
  }

  const formData = await request.formData();
  const duyuruId = typeof formData.get("duyuruId") === "string" ? (formData.get("duyuruId") as string) : "";
  const dosya = formData.get("gorsel");

  if (!duyuruId) {
    return NextResponse.json({ hata: "duyuruId zorunlu" }, { status: 400 });
  }
  if (!(dosya instanceof File) || dosya.size === 0) {
    return NextResponse.json({ hata: "görsel zorunlu" }, { status: 400 });
  }

  const duyuru = await prisma.duyuru.findFirst({
    where: { id: duyuruId, silindiMi: false },
    select: { id: true, gorselUrl: true },
  });
  if (!duyuru) {
    return NextResponse.json({ hata: "duyuru bulunamadı" }, { status: 404 });
  }

  const sonuc = await duyuruGorselGuncelle({ duyuruId, dosya, eskiDeger: duyuru.gorselUrl });
  if (sonuc.tur === "gecersiz-fotograf") {
    return NextResponse.json({ hata: sonuc.mesaj }, { status: 400 });
  }

  await prisma.durumGecmisi.create({
    data: { kullaniciId: session.user.id, varlikTuru: "Duyuru", varlikId: duyuruId, olay: "duyuru_gorsel_guncellendi" },
  });

  return NextResponse.json({ deger: sonuc.deger });
}

export async function DELETE(request: Request) {
  const { session, yetkili } = await getAdminSession();
  if (!yetkili || !session) {
    return NextResponse.json({ hata: "yetkisiz" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const duyuruId = typeof body?.duyuruId === "string" ? body.duyuruId : "";
  if (!duyuruId) {
    return NextResponse.json({ hata: "duyuruId zorunlu" }, { status: 400 });
  }

  const duyuru = await prisma.duyuru.findFirst({
    where: { id: duyuruId, silindiMi: false },
    select: { id: true, gorselUrl: true },
  });
  if (!duyuru) {
    return NextResponse.json({ hata: "duyuru bulunamadı" }, { status: 404 });
  }

  await duyuruGorselKaldir({ duyuruId, mevcutDeger: duyuru.gorselUrl });

  await prisma.durumGecmisi.create({
    data: { kullaniciId: session.user.id, varlikTuru: "Duyuru", varlikId: duyuruId, olay: "duyuru_gorsel_kaldirildi" },
  });

  return NextResponse.json({ tur: "kaldirildi" });
}
