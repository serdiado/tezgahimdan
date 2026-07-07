import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/yetki";
import { siteIcerikGorselGuncelle, siteIcerikGorselKaldir } from "@/lib/site-icerik";

const IZINLI_ANAHTARLAR = ["anasayfa_hero_gorsel"] as const;

export async function POST(request: Request) {
  const { session, yetkili } = await getAdminSession();
  if (!yetkili || !session) {
    return NextResponse.json({ hata: "yetkisiz" }, { status: 403 });
  }

  const formData = await request.formData();
  const anahtar = formData.get("anahtar");
  if (!(IZINLI_ANAHTARLAR as readonly string[]).includes(anahtar as string)) {
    return NextResponse.json({ hata: "geçersiz anahtar" }, { status: 400 });
  }
  const dosya = formData.get("gorsel");
  if (!(dosya instanceof File) || dosya.size === 0) {
    return NextResponse.json({ hata: "fotoğraf zorunlu" }, { status: 400 });
  }

  const mevcut = await prisma.siteIcerik.findUnique({ where: { anahtar: anahtar as string } });
  const sonuc = await siteIcerikGorselGuncelle({
    anahtar: anahtar as string,
    dosya,
    eskiDeger: mevcut?.deger ?? null,
  });
  if (sonuc.tur === "gecersiz-fotograf") {
    return NextResponse.json({ hata: sonuc.mesaj }, { status: 400 });
  }

  await prisma.durumGecmisi.create({
    data: {
      kullaniciId: session.user.id,
      varlikTuru: "SiteIcerik",
      varlikId: anahtar as string,
      olay: `site_icerik_gorsel_guncellendi:${anahtar}`,
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
  const anahtar = body?.anahtar;
  if (!(IZINLI_ANAHTARLAR as readonly string[]).includes(anahtar)) {
    return NextResponse.json({ hata: "geçersiz anahtar" }, { status: 400 });
  }

  const mevcut = await prisma.siteIcerik.findUnique({ where: { anahtar } });
  await siteIcerikGorselKaldir({ anahtar, mevcutDeger: mevcut?.deger ?? null });

  return NextResponse.json({ tur: "kaldirildi" });
}
