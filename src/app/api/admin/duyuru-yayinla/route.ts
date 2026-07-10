import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/yetki";
import { duyuruYayinla } from "@/lib/duyuru";

// Taslak duyuruyu yayinlar: hedef kitleye Bildirim pointer'lari uretir
// (idempotent, bkz. src/lib/duyuru.ts). "Bu islem geri alinamaz" - fan-out
// gonderilen bildirimleri geri cagirmaz; icerik sonradan duzenlenebilir ama
// yeniden gonderilmez.
export async function POST(request: Request) {
  const { session, yetkili } = await getAdminSession();
  if (!yetkili || !session) {
    return NextResponse.json({ hata: "yetkisiz" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) {
    return NextResponse.json({ hata: "id zorunlu" }, { status: 400 });
  }

  const sonuc = await duyuruYayinla(id, session.user.id);
  switch (sonuc.tur) {
    case "yayinlandi":
      return NextResponse.json({ tur: "yayinlandi", gonderilenSayisi: sonuc.gonderilenSayisi });
    case "zaten-yayinda":
      return NextResponse.json({ hata: "bu duyuru zaten yayınlanmış" }, { status: 409 });
    case "hedef-bos":
      return NextResponse.json({ hata: "hedef kitlede kullanıcı yok" }, { status: 404 });
    case "bulunamadi":
      return NextResponse.json({ hata: "duyuru bulunamadı" }, { status: 404 });
  }
}
