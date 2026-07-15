import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { magazaDegerlendirmeOzetiHaritasi } from "@/lib/magaza-degerlendirme";
import { sayfaModulleriGetir } from "@/lib/sayfa-modulu";
import { sayfaKes, sayfaNoCoz } from "@/lib/vitrin-sayfalama";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { DahaFazlaButonu } from "@/components/DahaFazlaButonu";
import { MagazaVitrini } from "../MagazaVitrini";

export const metadata: Metadata = {
  title: "Tüm Tezgahlar · Tezgahımdan",
};

// force-dynamic: sayfa artik searchParams (?sayfa=) aldigi icin zaten dinamik,
// yani bu satir teknik olarak gereksizlesti - AMA kaldirilmiyor: asil gerekcesi
// Docker build asamasinda DATABASE_URL olmamasi (kvkk/hakkimizda/sss ile ayni
// sebep), o gerekce hala gecerli ve kaldirmanin kazanci sifir.
export const dynamic = "force-dynamic";

const MAGAZA_LISTESI_FILTRESI = {
  silindiMi: false,
  gizliMi: false,
  duraklatildiMi: false,
  pazar: { aktifMi: true },
} as const;

// 2026-07-14: ana sayfadaki "Tezgahlar" onizlemesinin (slider) "Tum Tezgahlari
// Gor" hedefi. Ana sayfayla AYNI gorunurluk kurali (silindiMi/gizliMi/
// duraklatildiMi/pazar.aktifMi) - farkli bir kurala tabi olursa iki sayfa
// arasinda tutarsiz tezgah gorunur.
//
// 2026-07-15: sayfa artik SAYFALI ("Daha Fazla Goster"). Eskiden sinir YOKTU
// ("bu sayfanin tek isi tam listeyi gostermek") - tezgah sayisi arttikca
// sinirsiz buyuyecekti. Sayfa boyu ana sayfadaki AYNI ayardan gelir
// (magaza_listesi.ogeSayisi): iki sayfa da ayni bileseni (MagazaVitrini)
// render ediyor, ayar da ortak - ana sayfada "onizleme uzunlugu", burada
// "sayfa boyu" demek.
export default async function MagazalarSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ sayfa?: string }>;
}) {
  const { sayfa } = await searchParams;
  const sayfaNo = sayfaNoCoz(sayfa);

  const modul = (await sayfaModulleriGetir("anasayfa")).find((m) => m.tur === "magaza_listesi");
  const sayfaBoyu = ((modul?.ayarlar ?? {}) as { ogeSayisi?: number }).ogeSayisi ?? 12;
  const limit = sayfaBoyu * sayfaNo;

  const magazalarHam = await prisma.magaza.findMany({
    where: MAGAZA_LISTESI_FILTRESI,
    include: {
      pazar: { select: { ad: true, slug: true } },
      _count: { select: { urunler: { where: { silindiMi: false } } } },
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1, // +1 = "daha var mi" (bkz. sayfaKes)
  });
  const { ogeler: magazalar, dahaVarMi } = sayfaKes(magazalarHam, limit);

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
          {dahaVarMi && <DahaFazlaButonu href={`/magazalar?sayfa=${sayfaNo + 1}`} />}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
