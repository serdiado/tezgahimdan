import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/yetki";
import {
  gunDogrula,
  saatFormatiGecerliMi,
  saatliTarih,
  gecerliSaatDilimiMi,
  gecerliUrlMi,
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
        baslangicGunu,
        baslangicSaati: saatliTarih(baslangicSaatiHam),
        sifirlamaGunu,
        sifirlamaSaati: saatliTarih(sifirlamaSaatiHam),
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
