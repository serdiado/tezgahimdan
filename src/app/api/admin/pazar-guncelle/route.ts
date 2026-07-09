import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/yetki";
import { bildirimGonderPazarSaticilarina } from "@/lib/bildirim";
import { SLUG_REGEX } from "@/lib/slug";
import {
  gunDogrula,
  saatFormatiGecerliMi,
  saatliTarih,
  gecerliSaatDilimiMi,
  gecerliUrlMi,
  opsiyonelGunSaatDogrula,
  hedefOnceMi,
} from "../pazar-dogrulama";

export async function POST(request: Request) {
  const { session, yetkili } = await getAdminSession();
  if (!yetkili || !session) {
    return NextResponse.json({ hata: "yetkisiz" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  const ad = typeof body?.ad === "string" ? body.ad.trim() : "";
  const slug = typeof body?.slug === "string" ? body.slug.trim().toLowerCase() : "";
  const il = typeof body?.il === "string" ? body.il.trim() : "";
  const ilce = typeof body?.ilce === "string" ? body.ilce.trim() : "";
  const semtHam = typeof body?.semt === "string" ? body.semt.trim() : "";
  const googleHaritaLinki =
    typeof body?.googleHaritaLinki === "string" ? body.googleHaritaLinki.trim() : "";
  const belediyeAdiHam = typeof body?.belediyeAdi === "string" ? body.belediyeAdi.trim() : "";
  const aciklamaHam = typeof body?.aciklama === "string" ? body.aciklama.trim() : "";
  const sorumluAdiHam = typeof body?.sorumluAdi === "string" ? body.sorumluAdi.trim() : "";
  const sorumluTelefonHam =
    typeof body?.sorumluTelefon === "string" ? body.sorumluTelefon.trim() : "";
  const baslangicSaatiHam = typeof body?.baslangicSaati === "string" ? body.baslangicSaati : "";
  const sifirlamaSaatiHam = typeof body?.sifirlamaSaati === "string" ? body.sifirlamaSaati : "";
  const saatDilimi =
    typeof body?.saatDilimi === "string" && body.saatDilimi.trim()
      ? body.saatDilimi.trim()
      : "Europe/Istanbul";
  // aktifMi gonderilmezse mevcut deger korunur (asagida okunuyor); gonderildiyse
  // tip-guvenli olmali.
  const aktifMiGonderildi = typeof body?.aktifMi === "boolean";
  const aktifMi: boolean | undefined = aktifMiGonderildi ? body.aktifMi : undefined;

  if (!id) {
    return NextResponse.json({ hata: "id zorunlu" }, { status: 400 });
  }
  if (!ad || ad.length > 100) {
    return NextResponse.json({ hata: "pazar adı zorunlu (en fazla 100 karakter)" }, { status: 400 });
  }
  // magazaAc ile ayni slug kurallari - /pazar/[slug] URL'inde kullanilir.
  // Slug degisikligi ESKI linkleri kirar (belediyeye/basina paylasildiysa) -
  // admin bilincli degistirir, otomatik yonlendirme YOK (kucuk olcek karari).
  if (!slug || slug.length > 100 || !SLUG_REGEX.test(slug)) {
    return NextResponse.json(
      { hata: "geçersiz bağlantı adı (sadece küçük harf, rakam ve tire; ör. seferihisar-pazari)" },
      { status: 400 },
    );
  }
  if (!il || il.length > 100) {
    return NextResponse.json({ hata: "il zorunlu (en fazla 100 karakter)" }, { status: 400 });
  }
  if (!ilce || ilce.length > 100) {
    return NextResponse.json({ hata: "ilçe zorunlu (en fazla 100 karakter)" }, { status: 400 });
  }
  if (semtHam.length > 100) {
    return NextResponse.json({ hata: "semt en fazla 100 karakter olabilir" }, { status: 400 });
  }
  if (belediyeAdiHam.length > 150) {
    return NextResponse.json({ hata: "belediye adı en fazla 150 karakter olabilir" }, { status: 400 });
  }
  if (aciklamaHam.length > 1000) {
    return NextResponse.json({ hata: "açıklama en fazla 1000 karakter olabilir" }, { status: 400 });
  }
  if (sorumluAdiHam.length > 150) {
    return NextResponse.json({ hata: "sorumlu adı en fazla 150 karakter olabilir" }, { status: 400 });
  }
  if (sorumluTelefonHam.length > 30) {
    return NextResponse.json({ hata: "sorumlu telefonu en fazla 30 karakter olabilir" }, { status: 400 });
  }
  if (!googleHaritaLinki || !gecerliUrlMi(googleHaritaLinki) || googleHaritaLinki.length > 500) {
    return NextResponse.json(
      { hata: "google haritası linki zorunlu ve geçerli bir bağlantı (http/https) olmalı" },
      { status: 400 },
    );
  }
  const baslangicGunu = gunDogrula(typeof body?.baslangicGunu === "string" ? body.baslangicGunu : "");
  if (!baslangicGunu) {
    return NextResponse.json({ hata: "geçersiz başlangıç günü" }, { status: 400 });
  }
  const sifirlamaGunu = gunDogrula(typeof body?.sifirlamaGunu === "string" ? body.sifirlamaGunu : "");
  if (!sifirlamaGunu) {
    return NextResponse.json({ hata: "geçersiz sıfırlama günü" }, { status: 400 });
  }
  if (!saatFormatiGecerliMi(baslangicSaatiHam)) {
    return NextResponse.json({ hata: "geçersiz başlangıç saati (SS:DD biçiminde olmalı)" }, { status: 400 });
  }
  if (!saatFormatiGecerliMi(sifirlamaSaatiHam)) {
    return NextResponse.json({ hata: "geçersiz sıfırlama saati (SS:DD biçiminde olmalı)" }, { status: 400 });
  }
  if (!gecerliSaatDilimiMi(saatDilimi)) {
    return NextResponse.json({ hata: "geçersiz saat dilimi (ör. Europe/Istanbul)" }, { status: 400 });
  }

  const islemSonSonuc = opsiyonelGunSaatDogrula(
    body?.islemSonGunu, body?.islemSonSaati, "işlem sonu", sifirlamaGunu, sifirlamaSaatiHam,
  );
  if ("hata" in islemSonSonuc) {
    return NextResponse.json({ hata: islemSonSonuc.hata }, { status: 400 });
  }
  const hatirlatmaSonuc = opsiyonelGunSaatDogrula(
    body?.hatirlatmaGunu, body?.hatirlatmaSaati, "hatırlatma", sifirlamaGunu, sifirlamaSaatiHam,
  );
  if ("hata" in hatirlatmaSonuc) {
    return NextResponse.json({ hata: hatirlatmaSonuc.hata }, { status: 400 });
  }
  if (
    islemSonSonuc.gun && hatirlatmaSonuc.gun &&
    !hedefOnceMi(sifirlamaGunu, hatirlatmaSonuc.gun, hatirlatmaSonuc.saatHHMM!, islemSonSonuc.gun, islemSonSonuc.saatHHMM!)
  ) {
    return NextResponse.json(
      { hata: "hatırlatma, işlem sonu saatinden önce olmalı (yoksa hatırlatma işe yaramaz)" },
      { status: 400 },
    );
  }

  const mevcut = await prisma.pazar.findUnique({ where: { id }, select: { id: true, aktifMi: true } });
  if (!mevcut) {
    return NextResponse.json({ hata: "pazar bulunamadı" }, { status: 404 });
  }
  // Slug tekilligi: KENDISI haric baska bir pazar ayni slug'i kullaniyorsa reddet.
  const slugSahibi = await prisma.pazar.findUnique({ where: { slug }, select: { id: true } });
  if (slugSahibi && slugSahibi.id !== id) {
    return NextResponse.json({ hata: "bu bağlantı adı başka bir pazar tarafından kullanılıyor" }, { status: 409 });
  }

  // Tum admin yazma eylemleri DurumGecmisi'ne admin izi birakir (Build A
  // konvansiyonu) - kullaniciId eylemi yapan ADMIN'in kendisi.
  await prisma.$transaction([
    prisma.pazar.update({
      where: { id },
      data: {
        ad,
        slug,
        il,
        ilce,
        semt: semtHam || null,
        googleHaritaLinki,
        belediyeAdi: belediyeAdiHam || null,
        aciklama: aciklamaHam || null,
        sorumluAdi: sorumluAdiHam || null,
        sorumluTelefon: sorumluTelefonHam || null,
        baslangicGunu,
        baslangicSaati: saatliTarih(baslangicSaatiHam),
        sifirlamaGunu,
        sifirlamaSaati: saatliTarih(sifirlamaSaatiHam),
        islemSonGunu: islemSonSonuc.gun,
        islemSonSaati: islemSonSonuc.saat,
        hatirlatmaGunu: hatirlatmaSonuc.gun,
        hatirlatmaSaati: hatirlatmaSonuc.saat,
        saatDilimi,
        ...(aktifMi !== undefined ? { aktifMi } : {}),
      },
    }),
    prisma.durumGecmisi.create({
      data: {
        kullaniciId: session.user.id,
        varlikTuru: "Pazar",
        varlikId: id,
        olay: "pazar_guncellendi",
      },
    }),
  ]);

  // Motor/kilit disinda, transaction basariyla dondukten SONRA: pazar
  // aktif->pasif gecisinde bagli tum aktif saticilar giris yapamayacaklarina
  // dair bilgilendirilir (aktifMi gonderilmediyse veya zaten pasifse tetiklenmez).
  if (aktifMiGonderildi && mevcut.aktifMi === true && aktifMi === false) {
    await bildirimGonderPazarSaticilarina({ pazarId: id, pazarAdi: ad, haricKullaniciId: session.user.id });
  }

  return NextResponse.json({ tur: "guncellendi" });
}
