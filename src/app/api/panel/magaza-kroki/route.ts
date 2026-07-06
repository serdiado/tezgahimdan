import { NextResponse } from "next/server";
import { getSaticiSession } from "@/lib/yetki";
import { getOwnMagaza } from "@/lib/magaza";
import { magazaKrokiGuncelle, magazaKrokiKaldir } from "@/lib/magaza-kroki";

// magazaId istemciden ASLA alinmaz - oturumdaki saticinin kendi magazasindan
// turetilir (urun-ekle route'uyla ayni desen).
export async function POST(request: Request) {
  const { yetkili, session } = await getSaticiSession();
  if (!yetkili || !session) {
    return NextResponse.json({ hata: "yetkisiz" }, { status: 403 });
  }

  const magaza = await getOwnMagaza(session.user.id);
  if (!magaza) {
    return NextResponse.json({ hata: "once magaza olusturulmali" }, { status: 409 });
  }

  const formData = await request.formData();
  const dosya = formData.get("kroki");
  if (!(dosya instanceof File) || dosya.size === 0) {
    return NextResponse.json({ hata: "fotograf zorunlu" }, { status: 400 });
  }

  const sonuc = await magazaKrokiGuncelle({
    magazaId: magaza.id,
    dosya,
    eskiKrokiFotoUrl: magaza.krokiFotoUrl,
  });

  if (sonuc.tur === "gecersiz-fotograf") {
    return NextResponse.json({ hata: sonuc.mesaj }, { status: 400 });
  }

  return NextResponse.json({ krokiFotoUrl: sonuc.krokiFotoUrl });
}

export async function DELETE() {
  const { yetkili, session } = await getSaticiSession();
  if (!yetkili || !session) {
    return NextResponse.json({ hata: "yetkisiz" }, { status: 403 });
  }

  const magaza = await getOwnMagaza(session.user.id);
  if (!magaza) {
    return NextResponse.json({ hata: "once magaza olusturulmali" }, { status: 409 });
  }

  await magazaKrokiKaldir({ magazaId: magaza.id, mevcutKrokiFotoUrl: magaza.krokiFotoUrl });
  return NextResponse.json({ krokiFotoUrl: null });
}
