import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/yetki";
import {
  gunDogrula,
  saatFormatiGecerliMi,
  saatliTarih,
  gecerliSaatDilimiMi,
} from "../pazar-dogrulama";

export async function POST(request: Request) {
  const { session, yetkili } = await getAdminSession();
  if (!yetkili || !session) {
    return NextResponse.json({ hata: "yetkisiz" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  const ad = typeof body?.ad === "string" ? body.ad.trim() : "";
  const bolge = typeof body?.bolge === "string" ? body.bolge.trim() : "";
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
  if (!bolge || bolge.length > 100) {
    return NextResponse.json({ hata: "bölge zorunlu (en fazla 100 karakter)" }, { status: 400 });
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

  const mevcut = await prisma.pazar.findUnique({ where: { id }, select: { id: true } });
  if (!mevcut) {
    return NextResponse.json({ hata: "pazar bulunamadı" }, { status: 404 });
  }

  // Tum admin yazma eylemleri DurumGecmisi'ne admin izi birakir (Build A
  // konvansiyonu) - kullaniciId eylemi yapan ADMIN'in kendisi.
  await prisma.$transaction([
    prisma.pazar.update({
      where: { id },
      data: {
        ad,
        bolge,
        baslangicGunu,
        baslangicSaati: saatliTarih(baslangicSaatiHam),
        sifirlamaGunu,
        sifirlamaSaati: saatliTarih(sifirlamaSaatiHam),
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

  return NextResponse.json({ tur: "guncellendi" });
}
