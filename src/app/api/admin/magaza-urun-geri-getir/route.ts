import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/yetki";
import { urunGeriGetir } from "@/lib/urun";

// api/panel/urun-geri-getir ile AYNI urunGeriGetir() lib fonksiyonunu kullanir
// - sahiplik kontrolu yok. Faz 2.2'de admin urun kaldirma eklendi ama geri
// getirme unutulmustu (kullanici testinde bulundu) - bu route o eksigi kapatir.
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

  const sonuc = await urunGeriGetir({ id });
  if (sonuc.tur === "bulunamadi") {
    return NextResponse.json({ hata: "urun bulunamadi" }, { status: 404 });
  }

  await prisma.durumGecmisi.create({
    data: {
      kullaniciId: session.user.id,
      varlikTuru: "Urun",
      varlikId: id,
      olay: "urun_geri_getirildi:admin_adina",
    },
  });

  return NextResponse.json({ tur: "geri-getirildi" });
}
