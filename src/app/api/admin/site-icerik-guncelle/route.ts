import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/yetki";
import { siteIcerikGuncelle } from "@/lib/site-icerik";

const IZINLI_ANAHTARLAR = [
  "anasayfa_hero_baslik",
  "anasayfa_hero_aciklama",
  "anasayfa_hero_cta_metni",
  "anasayfa_hero_cta_link",
  "footer_slogan",
  "footer_aciklama",
  "hakkimizda_baslik",
  "hakkimizda_icerik",
  "sss_icerik",
  "kvkk_icerik",
] as const;
// Hakkimizda/SSS/KVKK gibi uzun metin alanlari icin (footer/hero kisa
// alanlar da bu ust siniri paylasir - UI tarafinda maxLength ile pratikte
// zaten kisaltiliyor, burada sadece kotuye kullanima karsi savunmaci sinir).
const DEGER_MAX = 5000;

export async function POST(request: Request) {
  const { session, yetkili } = await getAdminSession();
  if (!yetkili || !session) {
    return NextResponse.json({ hata: "yetkisiz" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const alanlar = body?.alanlar;
  if (!alanlar || typeof alanlar !== "object") {
    return NextResponse.json({ hata: "alanlar zorunlu" }, { status: 400 });
  }

  const girdiler: { anahtar: string; deger: string }[] = [];
  for (const anahtar of Object.keys(alanlar)) {
    if (!(IZINLI_ANAHTARLAR as readonly string[]).includes(anahtar)) {
      return NextResponse.json({ hata: `geçersiz anahtar: ${anahtar}` }, { status: 400 });
    }
    const deger = alanlar[anahtar];
    if (typeof deger !== "string" || deger.length > DEGER_MAX) {
      return NextResponse.json({ hata: `${anahtar} en fazla ${DEGER_MAX} karakter olabilir` }, { status: 400 });
    }
    girdiler.push({ anahtar, deger });
  }

  for (const { anahtar, deger } of girdiler) {
    await siteIcerikGuncelle(anahtar, deger);
  }

  await prisma.durumGecmisi.create({
    data: {
      kullaniciId: session.user.id,
      varlikTuru: "SiteIcerik",
      varlikId: "anasayfa_hero",
      olay: "site_icerik_guncellendi:anasayfa_hero",
    },
  });

  return NextResponse.json({ tur: "guncellendi" });
}
