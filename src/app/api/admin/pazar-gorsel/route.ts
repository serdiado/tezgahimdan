import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/yetki";
import { pazarGorselGuncelle, pazarGorselKaldir, type PazarGorselAlani } from "@/lib/pazar-gorsel";

// site-icerik-gorsel route'u ile ayni desen (admin yetkisi -> formData ->
// magic-number dogrulamali kayit -> DurumGecmisi izi). Alan whitelist'i
// pazar-gorsel.ts'teki union'in calisma-zamani karsiligi.
const IZINLI_ALANLAR: PazarGorselAlani[] = ["belediyeLogoUrl", "kapakFotoUrl"];

function alanDogrula(ham: unknown): PazarGorselAlani | null {
  return IZINLI_ALANLAR.includes(ham as PazarGorselAlani) ? (ham as PazarGorselAlani) : null;
}

export async function POST(request: Request) {
  const { session, yetkili } = await getAdminSession();
  if (!yetkili || !session) {
    return NextResponse.json({ hata: "yetkisiz" }, { status: 403 });
  }

  const formData = await request.formData();
  const pazarId = typeof formData.get("pazarId") === "string" ? (formData.get("pazarId") as string) : "";
  const alan = alanDogrula(formData.get("alan"));
  const dosya = formData.get("gorsel");

  if (!pazarId || !alan) {
    return NextResponse.json({ hata: "pazarId ve geçerli alan zorunlu" }, { status: 400 });
  }
  if (!(dosya instanceof File) || dosya.size === 0) {
    return NextResponse.json({ hata: "görsel zorunlu" }, { status: 400 });
  }

  const pazar = await prisma.pazar.findUnique({
    where: { id: pazarId },
    select: { id: true, belediyeLogoUrl: true, kapakFotoUrl: true },
  });
  if (!pazar) {
    return NextResponse.json({ hata: "pazar bulunamadı" }, { status: 404 });
  }

  const sonuc = await pazarGorselGuncelle({
    pazarId,
    alan,
    dosya,
    eskiDeger: pazar[alan],
  });
  if (sonuc.tur === "gecersiz-fotograf") {
    return NextResponse.json({ hata: sonuc.mesaj }, { status: 400 });
  }

  await prisma.durumGecmisi.create({
    data: {
      kullaniciId: session.user.id,
      varlikTuru: "Pazar",
      varlikId: pazarId,
      olay: `pazar_gorsel_guncellendi:${alan}`,
    },
  });

  return NextResponse.json({ deger: sonuc.deger });
}

export async function DELETE(request: Request) {
  const { session, yetkili } = await getAdminSession();
  if (!yetkili || !session) {
    return NextResponse.json({ hata: "yetkisiz" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const pazarId = typeof body?.pazarId === "string" ? body.pazarId : "";
  const alan = alanDogrula(body?.alan);

  if (!pazarId || !alan) {
    return NextResponse.json({ hata: "pazarId ve geçerli alan zorunlu" }, { status: 400 });
  }

  const pazar = await prisma.pazar.findUnique({
    where: { id: pazarId },
    select: { id: true, belediyeLogoUrl: true, kapakFotoUrl: true },
  });
  if (!pazar) {
    return NextResponse.json({ hata: "pazar bulunamadı" }, { status: 404 });
  }

  await pazarGorselKaldir({ pazarId, alan, mevcutDeger: pazar[alan] });

  await prisma.durumGecmisi.create({
    data: {
      kullaniciId: session.user.id,
      varlikTuru: "Pazar",
      varlikId: pazarId,
      olay: `pazar_gorsel_kaldirildi:${alan}`,
    },
  });

  return NextResponse.json({ tur: "kaldirildi" });
}
