import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { p2002Mi, prisma } from "@/lib/prisma";
import { rezervasyonOlustur } from "@/lib/rezervasyon";
import { telefonNormallestir } from "@/lib/telefon";

export async function POST(request: Request) {
  // KP-1: rezervasyon icin giris zorunlu. Vitrin/kesif girissiz acik, yalniz bu
  // eylem kimlik ister. girissizse istemci login'e yonlendirir (girisGerekli).
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { hata: "rezervasyon için giriş yapmalısınız", girisGerekli: true },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => null);
  const urunId = typeof body?.urunId === "string" ? body.urunId : "";
  if (!urunId) {
    return NextResponse.json({ hata: "urunId zorunlu" }, { status: 400 });
  }

  // Telefon: kullanicinin kayitli numarasi yoksa ilk rezervasyonda bir kerelik
  // istenir ve Kullanici.telefon'a yazilir; varsa hic sorulmaz/degistirilmez.
  const kullanici = await prisma.kullanici.findUnique({
    where: { id: session.user.id },
    select: { telefon: true },
  });
  if (!kullanici) {
    return NextResponse.json({ hata: "kullanıcı bulunamadı" }, { status: 401 });
  }
  if (!kullanici.telefon) {
    const telefonHam = typeof body?.telefon === "string" ? body.telefon.trim() : "";
    if (!telefonHam) {
      return NextResponse.json(
        { hata: "rezervasyon için telefon numarası gerekli", telefonGerekli: true },
        { status: 400 },
      );
    }
    const telefon = telefonNormallestir(telefonHam);
    if (!telefon) {
      return NextResponse.json(
        { hata: "geçersiz telefon (ör. 05XX XXX XX XX biçimini deneyin)", telefonGerekli: true },
        { status: 400 },
      );
    }
    try {
      await prisma.kullanici.update({ where: { id: session.user.id }, data: { telefon } });
    } catch (err) {
      // Kullanici.telefon @unique: numara baska bir hesaba kayitliysa DB reddeder.
      if (p2002Mi(err)) {
        return NextResponse.json(
          { hata: "bu telefon numarası başka bir hesaba kayıtlı", telefonGerekli: true },
          { status: 409 },
        );
      }
      throw err;
    }
  }

  const sonuc = await rezervasyonOlustur({ urunId, aliciId: session.user.id });

  switch (sonuc.tur) {
    case "olusturuldu":
      return NextResponse.json(
        { tip: sonuc.tip, siraNo: sonuc.siraNo, rezervKodu: sonuc.rezervKodu },
        { status: 201 },
      );
    case "zaten-var":
      return NextResponse.json(
        {
          hata: "bu ürün için zaten bekleyen rezervasyonunuz var",
          tip: sonuc.tip,
          siraNo: sonuc.siraNo,
          rezervKodu: sonuc.rezervKodu,
        },
        { status: 409 },
      );
    case "dolu":
      return NextResponse.json({ hata: "kapasite dolu" }, { status: 409 });
    case "magaza-gizli":
      return NextResponse.json(
        { hata: "Bu mağaza şu anda aktif değil, rezervasyon alınamıyor." },
        { status: 409 },
      );
    case "satista-degil":
      return NextResponse.json({ hata: "ürün satışta değil" }, { status: 409 });
    case "urun-yok":
      return NextResponse.json({ hata: "ürün bulunamadı" }, { status: 404 });
  }
}
