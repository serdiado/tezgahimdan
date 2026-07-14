import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { magazaDegerlendirmeOzetiHaritasi } from "@/lib/magaza-degerlendirme";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { MagazaVitrini } from "../MagazaVitrini";

export const metadata: Metadata = {
  title: "Tüm Tezgahlar · Tezgahımdan",
};

// force-dynamic sart: bu sayfa dogrudan prisma.magaza.findMany cagirir, dinamik
// segment/searchParams gibi bir "dynamic API" kullanmadigi icin Next.js build
// aninda statik uretmeye calisir - Docker build asamasinda DATABASE_URL yok,
// bu da build'i patlatir (kvkk/hakkimizda/sss sayfalarindaki ayni sebep).
export const dynamic = "force-dynamic";

// 2026-07-14: ana sayfadaki "Tezgahlar" onizlemesinin (slider, sinirli sayida
// en-yeni tezgah) "Tum Tezgahlari Gor" hedefi. Burada SINIR YOK - bilincli:
// bu sayfanin TEK isi tam listeyi gostermek. Ana sayfayla AYNI gorunurluk
// kurali (silindiMi/gizliMi/duraklatildiMi/pazar.aktifMi) - farkli bir kurala
// tabi olursa iki sayfa arasinda tutarsiz tezgah gorunur.
export default async function MagazalarSayfasi() {
  const magazalar = await prisma.magaza.findMany({
    where: { silindiMi: false, gizliMi: false, duraklatildiMi: false, pazar: { aktifMi: true } },
    include: {
      pazar: { select: { ad: true, slug: true } },
      _count: { select: { urunler: { where: { silindiMi: false } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const magazaDegerlendirmeOzeti = await magazaDegerlendirmeOzetiHaritasi(magazalar.map((m) => m.id));

  return (
    <div className="min-h-screen bg-neutral-50">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="text-xl font-bold text-neutral-900">Tüm Tezgahlar</h1>
        <div className="mt-4">
          <MagazaVitrini
            magazalar={magazalar.map((magaza) => ({
              id: magaza.id,
              ad: magaza.ad,
              slug: magaza.slug,
              aciklama: magaza.aciklama,
              pazarAd: magaza.pazar.ad,
              pazarSlug: magaza.pazar.slug,
              urunSayisi: magaza._count.urunler,
              degerlendirmeOrtalamasi: magazaDegerlendirmeOzeti.get(magaza.id)?.ortalama ?? null,
              degerlendirmeSayisi: magazaDegerlendirmeOzeti.get(magaza.id)?.sayi ?? 0,
            }))}
          />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
