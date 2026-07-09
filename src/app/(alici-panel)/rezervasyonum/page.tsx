import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { kullaniciDegerlendirmeleriHaritasi } from "@/lib/degerlendirme";
import { kullaniciMagazaDegerlendirmeleriHaritasi } from "@/lib/magaza-degerlendirme";
import { RezervasyonumIcerik } from "./RezervasyonumIcerik";

// KP-1: Kullanici Paneli'nin ilk ekrani. Kod+telefon aramasi YOK - girisli
// kullanici kendi rezervasyonlarini dogrudan gorur. Girissizse login'e (donusle).
// 2026-07-09 duzeltmesi: magaza-bazli degerlendirme sorgusu "/degerlendirmelerim/
// magazalar sayfasina tasindi" denilerek buradan cikarilmisti, ama o sayfa
// SADECE var olan degerlendirmeleri duzenliyor - yeni bir magaza degerlendirmesi
// BASLATMANIN hicbir yolu kalmamisti (canli kullanicida bulunan gercek bug).
// MagazaDegerlendirmeFormu'nun kendi yorumu da "bu modal /rezervasyonum'da
// gosterilir" diyordu - tutarsizlik acikti. Sorgu buraya geri tasindi.
export default async function RezervasyonumSayfasi() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/giris?next=/rezervasyonum");
  }

  const rezervasyonlar = await prisma.rezervasyon.findMany({
    where: { aliciId: session.user.id },
    include: { urun: { select: { baslik: true, magaza: { select: { id: true, ad: true, slug: true } } } } },
  });

  // Bekleyenler once (yonetilebilir), sonra sonuclananlar; her grup en yeniden eskiye.
  const sirali = [...rezervasyonlar].sort((a, b) => {
    const aOncelik = a.durum === "bekliyor" ? 0 : 1;
    const bOncelik = b.durum === "bekliyor" ? 0 : 1;
    if (aOncelik !== bOncelik) return aOncelik - bOncelik;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  // "Degerlendir" butonu SADECE durum="satildi" rezervasyonlarda cikar - o
  // urunlerin mevcut degerlendirmesi varsa (daha once yapilmis) formu
  // onceden doldurmak icin toplu (N+1'siz) sorgu.
  const satilanUrunIdler = Array.from(
    new Set(sirali.filter((r) => r.durum === "satildi").map((r) => r.urunId)),
  );
  const benimDegerlendirmelerim = await kullaniciDegerlendirmeleriHaritasi(
    session.user.id,
    satilanUrunIdler,
  );

  // Magaza-bazli: ayni desen, urun degil magaza id'siyle (bir magazadan birden
  // fazla urun alinmis olabilir - degerlendirme TEK, urun sayisi kadar degil).
  const satinAlinanMagazaIdler = Array.from(
    new Set(sirali.filter((r) => r.durum === "satildi").map((r) => r.urun.magaza.id)),
  );
  const benimMagazaDegerlendirmelerim = await kullaniciMagazaDegerlendirmeleriHaritasi(
    session.user.id,
    satinAlinanMagazaIdler,
  );

  return (
    <>
      <h1 className="text-xl font-bold text-neutral-900">Rezervasyonlarım</h1>
      <RezervasyonumIcerik
        rezervasyonlar={sirali.map((r) => ({
          id: r.id,
          rezervKodu: r.rezervKodu,
          tip: r.tip,
          siraNo: r.siraNo,
          durum: r.durum,
          urunId: r.urunId,
          urunBaslik: r.urun.baslik,
          magazaId: r.urun.magaza.id,
          magazaAd: r.urun.magaza.ad,
          magazaSlug: r.urun.magaza.slug,
          mevcutPuan: benimDegerlendirmelerim.get(r.urunId)?.puan ?? null,
          mevcutYorum: benimDegerlendirmelerim.get(r.urunId)?.yorum ?? null,
          magazaMevcutPuan: benimMagazaDegerlendirmelerim.get(r.urun.magaza.id)?.puan ?? null,
          magazaMevcutYorum: benimMagazaDegerlendirmelerim.get(r.urun.magaza.id)?.yorum ?? null,
        }))}
      />
    </>
  );
}
