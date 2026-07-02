import { NextResponse } from "next/server";
import { getSaticiSession } from "@/lib/yetki";
import { rezervasyonSonuclandir } from "@/lib/rezervasyon";

export async function POST(request: Request) {
  const { session, yetkili } = await getSaticiSession();
  if (!yetkili || !session) {
    return NextResponse.json({ hata: "yetkisiz" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const rezervId = typeof body?.rezervId === "string" ? body.rezervId : "";
  const sonuc = body?.sonuc === "satildi" || body?.sonuc === "gelmedi" ? body.sonuc : null;
  if (!rezervId || !sonuc) {
    return NextResponse.json({ hata: "rezervId ve gecerli sonuc zorunlu" }, { status: 400 });
  }

  const cikti = await rezervasyonSonuclandir({
    rezervId,
    sonuc,
    saticiUserId: session.user.id,
  });

  switch (cikti.tur) {
    case "sonuclandi":
      return NextResponse.json({
        sonuc: cikti.sonuc,
        yukselenKodu: cikti.yukselenKodu,
        urunTukendi: cikti.urunTukendi,
      });
    case "yetkisiz":
      return NextResponse.json({ hata: "bu rezervasyon sizin magazaniza ait degil" }, { status: 403 });
    case "bulunamadi":
      return NextResponse.json({ hata: "rezervasyon bulunamadi" }, { status: 404 });
    case "islenemez":
      return NextResponse.json({ hata: "islenemez", sebep: cikti.sebep }, { status: 409 });
  }
}
