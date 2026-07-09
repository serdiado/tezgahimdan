import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pazarHatirlatmalariGonder, pazarlariSifirla } from "@/lib/rezervasyon";
import { bildirimGonderKullaniciya, bildirimGonderTakipcilere } from "@/lib/bildirim";

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

  // Kapanistan ONCE (2 saatlik pencerede) saticiya hatirlatma - pazarlariSifirla
  // ile ayni cron/ayni an, ama kendi (pazarId,pazarHaftasi) idempotency'sine
  // sahip, birbirinden bagimsiz. Sirasi onemli: hatirlatma penceresi (kapanistan
  // ONCE) ile sifirlama tetiklemesi (kapanistan SONRA) zaten zaman olarak
  // ayrisik, ama okunabilirlik icin hatirlatma once cagrilir.
  const hatirlatmaSonucu = await pazarHatirlatmalariGonder();

  const sonuc = await pazarlariSifirla();

  // Otomatik no-show cezasi HER ZAMAN aktif-tier (bkz. urunSifirla); cezasiz
  // iptal (karisik aktif+yedek) BILINCLI olarak bildirim kapsami disi birakildi
  // (kullanici karari, bkz. plan dosyasi). Latency-duyarsiz arka plan isi
  // oldugu icin N+1 yerine tek toplu baslik sorgusu yeterli.
  if (sonuc.tumNoShowlar.length > 0) {
    const urunIdler = [...new Set(sonuc.tumNoShowlar.map((n) => n.urunId))];
    const urunler = await prisma.urun.findMany({
      where: { id: { in: urunIdler } },
      select: { id: true, baslik: true, magaza: { select: { sahipId: true } } },
    });
    const urunBilgisi = new Map(urunler.map((u) => [u.id, { baslik: u.baslik, sahipId: u.magaza.sahipId }]));

    for (const noShow of sonuc.tumNoShowlar) {
      const bilgi = urunBilgisi.get(noShow.urunId);
      if (!bilgi) continue;
      await bildirimGonderTakipcilere({
        urunId: noShow.urunId,
        mesaj: `Takip ettiğiniz "${bilgi.baslik}" için hak sahibi gelmedi, yeni bir hak açıldı.`,
        haricKullaniciIdler: [noShow.aliciId],
      });
    }

    // Saticiya OZET: her satici icin, bu calismada isaretlemedigi icin otomatik
    // "gelmedi" olan urun basliklarinin listesi - tek tek degil TOPLU (spam
    // onleme). Bir satiya ait birden fazla urun/rezervasyon olabilir.
    const saticiOzetleri = new Map<string, string[]>();
    for (const noShow of sonuc.tumNoShowlar) {
      const bilgi = urunBilgisi.get(noShow.urunId);
      if (!bilgi) continue;
      const liste = saticiOzetleri.get(bilgi.sahipId) ?? [];
      liste.push(bilgi.baslik);
      saticiOzetleri.set(bilgi.sahipId, liste);
    }
    for (const [sahipId, basliklar] of saticiOzetleri) {
      const benzersizBasliklar = [...new Set(basliklar)];
      const urunListesi =
        benzersizBasliklar.length <= 3
          ? benzersizBasliklar.map((b) => `"${b}"`).join(", ")
          : `${benzersizBasliklar.length} üründe`;
      await bildirimGonderKullaniciya({
        kullaniciId: sahipId,
        mesaj: `Pazar kapanışında işaretlemediğin için ${urunListesi} toplam ${basliklar.length} rezervasyon otomatik "gelmedi" oldu.`,
        hedefYolu: "/panel/rezervasyonlar",
      });
    }
  }

  return NextResponse.json({ ...sonuc, hatirlatma: hatirlatmaSonucu });
}
