import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rezervasyonVazgec } from "@/lib/rezervasyon";
import {
  bildirimGonderKullaniciya,
  bildirimGonderTakipcilere,
  bildirimGonderYukselenKullaniciya,
} from "@/lib/bildirim";

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
          select: { baslik: true, magaza: { select: { sahipId: true } } },
        });
        if (urun) {
          // Yedekten aktife yukselen biri varsa once ona kisisel bildirim
          // gonderilir; donen aliciId genel takipci bildiriminin haric
          // listesine eklenir (aksi halde yukselen kisi, urunu takip
          // ediyorsa, ayni olay icin cift/yaniltici bildirim alirdi).
          const haricListesi = [session.user.id];
          if (sonuc.yukselenKodu) {
            const yukselenAliciId = await bildirimGonderYukselenKullaniciya({
              yukselenKodu: sonuc.yukselenKodu,
              urunId: sonuc.urunId,
              urunBaslik: urun.baslik,
            });
            if (yukselenAliciId) haricListesi.push(yukselenAliciId);
          }
          await bildirimGonderTakipcilere({
            urunId: sonuc.urunId,
            mesaj: `Takip ettiğiniz "${urun.baslik}" için aktif bir rezervasyon iptal edildi.`,
            haricKullaniciIdler: haricListesi,
          });
          // Tezgah sahibine de haber ver (kendine bildirim gonderme: eylemi
          // yapan alici ayni zamanda magaza sahibi olamaz ama yine de kontrol
          // edilir - projenin genel deseniyle tutarli).
          if (session.user.id !== urun.magaza.sahipId) {
            await bildirimGonderKullaniciya({
              kullaniciId: urun.magaza.sahipId,
              mesaj: `"${urun.baslik}" için bir alıcı rezervasyonundan vazgeçti.`,
              hedefYolu: "/panel/rezervasyonlar",
            });
          }
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
