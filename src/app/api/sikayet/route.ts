import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const SEBEP_MAX = 500;

// Vitrinden sikayet olusturma - girisli HERKES (rol farki yok) sikayet edebilir.
// hedefMagazaId / hedefUrunId'den TAM BIRI dolu olmali (schema.prisma:197 -
// uygulama katmaninda kontrol edilir, DB'de zorlanmiyor).
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ hata: "şikayet oluşturmak için giriş yapmalısınız" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const hedefTuru = body?.hedefTuru === "magaza" || body?.hedefTuru === "urun" ? body.hedefTuru : "";
  const hedefId = typeof body?.hedefId === "string" ? body.hedefId : "";
  const sebep = typeof body?.sebep === "string" ? body.sebep.trim() : "";

  if (!hedefTuru || !hedefId) {
    return NextResponse.json({ hata: "hedef zorunlu" }, { status: 400 });
  }
  if (!sebep || sebep.length > SEBEP_MAX) {
    return NextResponse.json(
      { hata: `şikayet sebebi zorunlu (en fazla ${SEBEP_MAX} karakter)` },
      { status: 400 },
    );
  }

  const hedefMagazaId = hedefTuru === "magaza" ? hedefId : null;
  const hedefUrunId = hedefTuru === "urun" ? hedefId : null;

  if (hedefMagazaId) {
    const magaza = await prisma.magaza.findUnique({ where: { id: hedefMagazaId }, select: { id: true } });
    if (!magaza) {
      return NextResponse.json({ hata: "mağaza bulunamadı" }, { status: 404 });
    }
  } else {
    const urun = await prisma.urun.findUnique({ where: { id: hedefUrunId! }, select: { id: true } });
    if (!urun) {
      return NextResponse.json({ hata: "ürün bulunamadı" }, { status: 404 });
    }
  }

  // Tekrar freni: ayni kullanici + ayni hedef icin zaten BEKLIYOR/INCELENIYOR bir
  // sikayet varsa yenisi reddedilir - moderasyon kuyrugunun ayni sikayetle
  // sismesini onler (kullanici zaten "sonuc bekliyor" durumundadir).
  const mevcut = await prisma.sikayet.findFirst({
    where: {
      sikayetciId: session.user.id,
      durum: { in: ["bekliyor", "inceleniyor"] },
      ...(hedefMagazaId ? { hedefMagazaId } : { hedefUrunId }),
    },
    select: { id: true },
  });
  if (mevcut) {
    return NextResponse.json(
      { hata: "bu konuda zaten bekleyen bir şikayetiniz var, ekibimiz inceliyor" },
      { status: 409 },
    );
  }

  const sikayet = await prisma.$transaction(async (tx) => {
    const yeni = await tx.sikayet.create({
      data: {
        sikayetciId: session.user.id,
        hedefMagazaId,
        hedefUrunId,
        sebep,
      },
    });
    // PLAN.md SS5: onemli degisiklikler DurumGecmisi'ne loglanir (kullanici-
    // kaynakli olay - kullaniciId sikayetcinin kendisi, admin izi degil).
    await tx.durumGecmisi.create({
      data: {
        kullaniciId: session.user.id,
        varlikTuru: "Sikayet",
        varlikId: yeni.id,
        olay: "sikayet_olusturuldu",
      },
    });
    return yeni;
  });

  return NextResponse.json({ id: sikayet.id }, { status: 201 });
}
