import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getMagazaBySlug } from "@/lib/magaza";
import { SiteHeader } from "@/components/SiteHeader";
import { MagazaHero } from "./MagazaHero";
import { MagazaIcerik } from "./MagazaIcerik";

export default async function MagazaSayfasi({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const magaza = await getMagazaBySlug(slug);

  if (!magaza) {
    notFound();
  }

  // 'doldu' urunler de listelenir (buton kapali olarak) - kapasitesi dolan
  // urun vitrinden kaybolmamali, alici dolu oldugunu gormeli. 'satildi' ve
  // silinmis urunler gizli kalir.
  const urunler = await prisma.urun.findMany({
    where: { magazaId: magaza.id, durum: { in: ["sergide", "doldu"] }, silindiMi: false },
    include: { kategori: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-neutral-50">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-8">
          <MagazaHero
            magaza={{
              ad: magaza.ad,
              aciklama: magaza.aciklama,
              pazar: { ad: magaza.pazar.ad, sifirlamaGunu: magaza.pazar.sifirlamaGunu },
            }}
          />
        </div>

        <MagazaIcerik
          urunler={urunler.map((urun) => ({
            id: urun.id,
            baslik: urun.baslik,
            fiyat: Number(urun.fiyat),
            durum: urun.durum,
            fotograflar: urun.fotograflar,
            kategori: { id: urun.kategori.id, ad: urun.kategori.ad },
          }))}
        />
      </main>
    </div>
  );
}
