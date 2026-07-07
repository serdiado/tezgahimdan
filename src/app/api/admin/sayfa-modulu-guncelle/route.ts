import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/yetki";

const GECERLI_TURLER = ["haftalik_ritim", "yeni_urunler", "en_cok_begenilen", "magaza_listesi"] as const;
const GECERLI_KOLON = [3, 4];
const GECERLI_SUNUM = ["grid", "slider"];

// Sira BURADA degistirilmez (bkz. sayfa-modulu-sirala/route.ts - iki satirin
// es zamanli swap'i ayri bir endpoint, cunku tek satirlik update'ten farkli
// bir sekil). Bu route sadece aktifMi ve/veya ayarlar gunceller.
export async function POST(request: Request) {
  const { session, yetkili } = await getAdminSession();
  if (!yetkili || !session) {
    return NextResponse.json({ hata: "yetkisiz" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const tur = body?.tur;
  if (!(GECERLI_TURLER as readonly string[]).includes(tur)) {
    return NextResponse.json({ hata: "geçersiz modül türü" }, { status: 400 });
  }

  const data: { aktifMi?: boolean; ayarlar?: object } = {};

  if (typeof body?.aktifMi === "boolean") {
    data.aktifMi = body.aktifMi;
  }

  if (body?.ayarlar !== undefined) {
    const ayarlarRaw = body.ayarlar;
    const ayarlar: { kolonSayisi?: number; sunumTipi?: string; ogeSayisi?: number } = {};
    if (ayarlarRaw?.kolonSayisi !== undefined) {
      if (!GECERLI_KOLON.includes(ayarlarRaw.kolonSayisi)) {
        return NextResponse.json({ hata: "kolon sayısı 3 veya 4 olmalı" }, { status: 400 });
      }
      ayarlar.kolonSayisi = ayarlarRaw.kolonSayisi;
    }
    if (ayarlarRaw?.sunumTipi !== undefined) {
      if (!GECERLI_SUNUM.includes(ayarlarRaw.sunumTipi)) {
        return NextResponse.json({ hata: "sunum tipi grid veya slider olmalı" }, { status: 400 });
      }
      ayarlar.sunumTipi = ayarlarRaw.sunumTipi;
    }
    if (ayarlarRaw?.ogeSayisi !== undefined) {
      const ogeSayisi = Number(ayarlarRaw.ogeSayisi);
      if (!Number.isInteger(ogeSayisi) || ogeSayisi < 4 || ogeSayisi > 24) {
        return NextResponse.json({ hata: "öğe sayısı 4-24 arasında olmalı" }, { status: 400 });
      }
      ayarlar.ogeSayisi = ogeSayisi;
    }
    data.ayarlar = ayarlar;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ hata: "güncellenecek alan yok" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.sayfaModulu.update({ where: { tur }, data }),
    prisma.durumGecmisi.create({
      data: {
        kullaniciId: session.user.id,
        varlikTuru: "SayfaModulu",
        varlikId: tur,
        olay: `sayfa_modulu_guncellendi:${tur}`,
      },
    }),
  ]);

  return NextResponse.json({ tur: "guncellendi" });
}
