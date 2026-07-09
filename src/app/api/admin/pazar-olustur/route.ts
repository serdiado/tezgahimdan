import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/yetki";
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
  const ad = typeof body?.ad === "string" ? body.ad.trim() : "";
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

  if (!ad || ad.length > 100) {
    return NextResponse.json({ hata: "pazar adı zorunlu (en fazla 100 karakter)" }, { status: 400 });
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

  // islemSon*/hatirlatma*: opsiyonel, ama ayarlanirsa kapanistan SONRA olmali
  // (gece pazarlari icin gun bile farkli olabilir - bkz. pazar-dogrulama.ts).
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
  // Ikisi de ayarlandiysa: hatirlatma, islem-sonundan SONRA olamaz (aksi halde
  // satici hatirlatmayi aldiginda ceza coktan uygulanmis olur - bkz. rezervasyon.ts
  // pazarHatirlatmalariGonder'daki "BILINEN TUTARSIZLIK" gecmisi, ayni hata
  // burada admin yapilandirmasi seviyesinde tekrar olusmasin diye engellenir).
  if (
    islemSonSonuc.gun && hatirlatmaSonuc.gun &&
    !hedefOnceMi(sifirlamaGunu, hatirlatmaSonuc.gun, hatirlatmaSonuc.saatHHMM!, islemSonSonuc.gun, islemSonSonuc.saatHHMM!)
  ) {
    return NextResponse.json(
      { hata: "hatırlatma, işlem sonu saatinden önce olmalı (yoksa hatırlatma işe yaramaz)" },
      { status: 400 },
    );
  }

  // Kalici yazma eylemi: DurumGecmisi'ne ADMIN'in kendi id'siyle iz birakilir
  // (Build A konvansiyonu - kullaniciId = eylemi yapan, etkilenen kayit degil).
  const pazar = await prisma.$transaction(async (tx) => {
    const yeni = await tx.pazar.create({
      data: {
        ad,
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
      },
    });
    await tx.durumGecmisi.create({
      data: {
        kullaniciId: session.user.id,
        varlikTuru: "Pazar",
        varlikId: yeni.id,
        olay: "pazar_olusturuldu",
      },
    });
    return yeni;
  });

  return NextResponse.json({ id: pazar.id }, { status: 201 });
}
