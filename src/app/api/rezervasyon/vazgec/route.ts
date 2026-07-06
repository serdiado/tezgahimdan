import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rezervasyonVazgec } from "@/lib/rezervasyon";
import { bildirimGonderTakipcilere } from "@/lib/bildirim";

export async function POST(request: Request) {
  // KP-1: kimlik dogrulama artik (kod + telefon) degil, giris yapmis kullanicinin
  // kendi rezervasyonu. rezervId gelir ama motor aliciId eslesmesini kontrol eder.
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ hata: "giriş yapmalısınız" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const rezervId = typeof body?.rezervId === "string" ? body.rezervId : "";
  if (!rezervId) {
    return NextResponse.json({ hata: "rezervId zorunlu" }, { status: 400 });
  }

  const sonuc = await rezervasyonVazgec({ rezervId, aliciId: session.user.id });

  switch (sonuc.tur) {
    case "iptal-edildi":
      if (sonuc.tip === "aktif") {
        const urun = await prisma.urun.findUnique({
          where: { id: sonuc.urunId },
          select: { baslik: true },
        });
        if (urun) {
          await bildirimGonderTakipcilere({
            urunId: sonuc.urunId,
            mesaj: `Takip ettiğiniz "${urun.baslik}" için aktif bir rezervasyon iptal edildi.`,
            haricKullaniciId: session.user.id,
          });
        }
      }
      return NextResponse.json({ mesaj: "rezervasyon iptal edildi" });
    case "bulunamadi":
      return NextResponse.json({ hata: "rezervasyon bulunamadı" }, { status: 404 });
    case "islenemez":
      return NextResponse.json(
        { hata: "bu rezervasyon zaten sonuçlanmış", durum: sonuc.durum },
        { status: 409 },
      );
  }
}
