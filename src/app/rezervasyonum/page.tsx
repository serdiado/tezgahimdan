import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { kullaniciDegerlendirmeleriHaritasi } from "@/lib/degerlendirme";
import { kullaniciMagazaDegerlendirmeleriHaritasi } from "@/lib/magaza-degerlendirme";
import { SiteHeader } from "@/components/SiteHeader";
import { RezervasyonumIcerik } from "./RezervasyonumIcerik";

// KP-1: Kullanici Paneli'nin ilk ekrani. Kod+telefon aramasi YOK - girisli
// kullanici kendi rezervasyonlarini dogrudan gorur. Girissizse login'e (donusle).
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

  // Mağaza değerlendirmesi buton bazlı DEĞİL, MAĞAZA bazlı - aynı mağazadan 3 ürün
  // alınmışsa 3 değil 1 buton çıksın diye satın alınan mağazalardan Map ile tekil
  // liste çıkarıyoruz (satilanUrunIdler'i çıkarma mantığına paralel).
  const satilanMagazalarHaritasi = new Map<string, { ad: string; slug: string }>();
  for (const r of sirali) {
    if (r.durum === "satildi") {
      satilanMagazalarHaritasi.set(r.urun.magaza.id, { ad: r.urun.magaza.ad, slug: r.urun.magaza.slug });
    }
  }
  const benimMagazaDegerlendirmelerim = await kullaniciMagazaDegerlendirmeleriHaritasi(
    session.user.id,
    Array.from(satilanMagazalarHaritasi.keys()),
  );

  return (
    <div className="min-h-screen bg-neutral-50">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-6">
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
            magazaAd: r.urun.magaza.ad,
            magazaSlug: r.urun.magaza.slug,
            mevcutPuan: benimDegerlendirmelerim.get(r.urunId)?.puan ?? null,
            mevcutYorum: benimDegerlendirmelerim.get(r.urunId)?.yorum ?? null,
          }))}
          degerlendirilebilirMagazalar={Array.from(satilanMagazalarHaritasi.entries()).map(
            ([magazaId, magaza]) => ({
              magazaId,
              magazaAd: magaza.ad,
              magazaSlug: magaza.slug,
              mevcutPuan: benimMagazaDegerlendirmelerim.get(magazaId)?.puan ?? null,
              mevcutYorum: benimMagazaDegerlendirmelerim.get(magazaId)?.yorum ?? null,
            }),
          )}
        />
      </main>
    </div>
  );
}
