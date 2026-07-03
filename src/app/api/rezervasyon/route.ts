import { NextResponse } from "next/server";
import { rezervasyonOlustur } from "@/lib/rezervasyon";
import { telefonNormallestir } from "@/lib/telefon";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const urunId = typeof body?.urunId === "string" ? body.urunId : "";
  const ad = typeof body?.ad === "string" ? body.ad.trim() : "";
  const telefonHam = typeof body?.telefon === "string" ? body.telefon.trim() : "";

  if (!urunId || !ad || ad.length > 100 || !telefonHam) {
    return NextResponse.json({ hata: "urunId, ad ve telefon zorunlu" }, { status: 400 });
  }
  const telefon = telefonNormallestir(telefonHam);
  if (!telefon) {
    return NextResponse.json(
      { hata: "gecersiz telefon (or. 05XX XXX XX XX bicimini deneyin)" },
      { status: 400 },
    );
  }

  const sonuc = await rezervasyonOlustur({ urunId, ad, telefon });

  switch (sonuc.tur) {
    case "olusturuldu":
      return NextResponse.json(
        { tip: sonuc.tip, siraNo: sonuc.siraNo, rezervKodu: sonuc.rezervKodu },
        { status: 201 },
      );
    case "zaten-var":
      return NextResponse.json(
        {
          hata: "bu urun icin zaten bekleyen rezervasyonunuz var",
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
      return NextResponse.json({ hata: "urun satista degil" }, { status: 409 });
    case "urun-yok":
      return NextResponse.json({ hata: "urun bulunamadi" }, { status: 404 });
  }
}
