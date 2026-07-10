import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/yetki";
import type { DuyuruTuru } from "@/generated/prisma";

// Duyuru olustur (id yoksa) ya da guncelle (id varsa) - tek route (form kucuk,
// pazar-olustur/guncelle ayrimina gerek yok). Icerik yayindan SONRA da
// duzenlenebilir (duzeltme; detay sayfasi canli okur) - "Yayinla" ayri islem
// (duyuru-yayinla), bu route yalniz taslak icerigi yazar/gunceller.
const BASLIK_MAX = 200;
const GOVDE_MAX = 5000;
const TURLER = ["bilgi", "egitim", "uyari"] as const;
const HEDEF_KITLELER = ["hepsi", "satici", "alici"] as const;

export async function POST(request: Request) {
  const { session, yetkili } = await getAdminSession();
  if (!yetkili || !session) {
    return NextResponse.json({ hata: "yetkisiz" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" && body.id ? body.id : null;
  const baslik = typeof body?.baslik === "string" ? body.baslik.trim() : "";
  const govde = typeof body?.govde === "string" ? body.govde.trim() : "";
  const tur = body?.tur;
  const hedefKitle = body?.hedefKitle;

  if (!baslik || baslik.length > BASLIK_MAX) {
    return NextResponse.json({ hata: `başlık zorunlu (en fazla ${BASLIK_MAX} karakter)` }, { status: 400 });
  }
  if (!govde || govde.length > GOVDE_MAX) {
    return NextResponse.json({ hata: `içerik zorunlu (en fazla ${GOVDE_MAX} karakter)` }, { status: 400 });
  }
  if (!(TURLER as readonly string[]).includes(tur)) {
    return NextResponse.json({ hata: "geçersiz duyuru türü" }, { status: 400 });
  }
  if (!(HEDEF_KITLELER as readonly string[]).includes(hedefKitle)) {
    return NextResponse.json({ hata: "geçersiz hedef kitle" }, { status: 400 });
  }

  if (id) {
    // Guncelleme: silinmis duyuru duzenlenemez. hedefKitle yayindan SONRA
    // degistirilse bile fan-out coktan yapildigi icin yeni kitleye gitmez -
    // yalniz gorunum/kayit degeri; bu kabul edilen bir sinir.
    const mevcut = await prisma.duyuru.findFirst({ where: { id, silindiMi: false }, select: { id: true } });
    if (!mevcut) {
      return NextResponse.json({ hata: "duyuru bulunamadı" }, { status: 404 });
    }
    await prisma.duyuru.update({
      where: { id },
      data: { baslik, govde, tur: tur as DuyuruTuru, hedefKitle },
    });
    return NextResponse.json({ tur: "guncellendi", id });
  }

  const olusturulan = await prisma.duyuru.create({
    data: { baslik, govde, tur: tur as DuyuruTuru, hedefKitle, olusturanId: session.user.id },
    select: { id: true },
  });
  await prisma.durumGecmisi.create({
    data: {
      kullaniciId: session.user.id,
      varlikTuru: "Duyuru",
      varlikId: olusturulan.id,
      olay: "duyuru_olusturuldu",
    },
  });
  return NextResponse.json({ tur: "olusturuldu", id: olusturulan.id });
}
