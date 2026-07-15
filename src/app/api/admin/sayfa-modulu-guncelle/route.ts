import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/yetki";

const GECERLI_SAYFALAR = ["anasayfa", "magaza_hero"] as const;
const GECERLI_TURLER = [
  "haftalik_ritim",
  "yeni_urunler",
  "en_cok_begenilen",
  "magaza_listesi",
  "magaza_hero_whatsapp",
  "magaza_hero_kroki",
  "magaza_hero_puan",
  "magaza_urun_listesi",
] as const;
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
  const sayfa = body?.sayfa;
  const tur = body?.tur;
  if (!(GECERLI_SAYFALAR as readonly string[]).includes(sayfa)) {
    return NextResponse.json({ hata: "geçersiz sayfa" }, { status: 400 });
  }
  if (!(GECERLI_TURLER as readonly string[]).includes(tur)) {
    return NextResponse.json({ hata: "geçersiz modül türü" }, { status: 400 });
  }

  const data: { aktifMi?: boolean } = {};
  let gelenAyarlar: { kolonSayisi?: number; sunumTipi?: string; ogeSayisi?: number } | null = null;

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
    // BIRLESTIR, EZME. Istemci her kontrolu AYRI istekte gonderiyor (bkz.
    // SayfaModuluKarti.tsx: kolonSayisi / sunumTipi / ogeSayisi ayri ayri
    // guncelle() cagiriyor). Eskiden burada `data.ayarlar = ayarlar` vardi ve
    // JSON kolonunu tumuyle DEGISTIRIYORDU: admin sadece "Kolon Sayisi"ni
    // secince sunumTipi VE ogeSayisi siliniyor, ogeSayisi input'u ekrandan
    // kayboluyor (admin sayfasi `ayarlar.ogeSayisi !== undefined` kosuluyla
    // gosteriyordu) ve limit sessizce varsayilana donuyordu. 2026-07-15'te
    // vitrin sayfalamasi ogeSayisi'na baglanirken bulundu.
    gelenAyarlar = ayarlar;
  }

  if (!gelenAyarlar && data.aktifMi === undefined) {
    return NextResponse.json({ hata: "güncellenecek alan yok" }, { status: 400 });
  }

  const sonuc = await prisma.$transaction(async (tx) => {
    // Mevcut ayarlari AYNI transaction icinde oku - iki admin es zamanli
    // farkli kontrolleri degistirirse biri otekini ezmesin.
    const mevcut = await tx.sayfaModulu.findUnique({
      where: { sayfa_tur: { sayfa, tur } },
      select: { ayarlar: true },
    });
    if (!mevcut) return { bulunamadi: true as const };

    const guncelData: { aktifMi?: boolean; ayarlar?: Prisma.InputJsonValue } = { ...data };
    if (gelenAyarlar) {
      const oncekiler = (mevcut.ayarlar ?? {}) as Record<string, unknown>;
      guncelData.ayarlar = { ...oncekiler, ...gelenAyarlar } as Prisma.InputJsonValue;
    }

    await tx.sayfaModulu.update({ where: { sayfa_tur: { sayfa, tur } }, data: guncelData });
    await tx.durumGecmisi.create({
      data: {
        kullaniciId: session.user.id,
        varlikTuru: "SayfaModulu",
        varlikId: `${sayfa}:${tur}`,
        olay: `sayfa_modulu_guncellendi:${sayfa}:${tur}`,
      },
    });
    return { bulunamadi: false as const };
  });

  if (sonuc.bulunamadi) {
    return NextResponse.json({ hata: "modül bulunamadı" }, { status: 404 });
  }

  return NextResponse.json({ tur: "guncellendi" });
}
