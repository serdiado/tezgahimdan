import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pazarlariSifirla } from "@/lib/rezervasyon";
import { bildirimGonderTakipcilere } from "@/lib/bildirim";

// Harici cron (Docker/VPS) her ~5 dk cagirir:
//   curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
//        https://.../api/cron/pazar-sifirlama
// Zamana degil DURUMA bakar (kapanis vakti gecmis + hala bekleyen) - restart'ta
// kacmaz, cift tetiklemede idempotent (kilit + durum kontrolu).
export async function POST(request: Request) {
  const gizli = process.env.CRON_SECRET;
  if (!gizli) {
    return NextResponse.json({ hata: "CRON_SECRET tanimli degil" }, { status: 500 });
  }
  const authz = request.headers.get("authorization");
  if (authz !== `Bearer ${gizli}`) {
    return NextResponse.json({ hata: "yetkisiz" }, { status: 401 });
  }

  const sonuc = await pazarlariSifirla();

  // Otomatik no-show cezasi HER ZAMAN aktif-tier (bkz. urunSifirla); cezasiz
  // iptal (karisik aktif+yedek) BILINCLI olarak bildirim kapsami disi birakildi
  // (kullanici karari, bkz. plan dosyasi). Latency-duyarsiz arka plan isi
  // oldugu icin N+1 yerine tek toplu baslik sorgusu yeterli.
  if (sonuc.tumNoShowlar.length > 0) {
    const urunIdler = [...new Set(sonuc.tumNoShowlar.map((n) => n.urunId))];
    const urunler = await prisma.urun.findMany({
      where: { id: { in: urunIdler } },
      select: { id: true, baslik: true },
    });
    const basliklar = new Map(urunler.map((u) => [u.id, u.baslik]));
    for (const noShow of sonuc.tumNoShowlar) {
      const baslik = basliklar.get(noShow.urunId);
      if (!baslik) continue;
      await bildirimGonderTakipcilere({
        urunId: noShow.urunId,
        mesaj: `Takip ettiğiniz "${baslik}" için hak sahibi gelmedi, yeni bir hak açıldı.`,
        haricKullaniciId: noShow.aliciId,
      });
    }
  }

  return NextResponse.json({ ...sonuc });
}
