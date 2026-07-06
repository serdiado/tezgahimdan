import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMagazaBySlug } from "@/lib/magaza";
import { begeniSayilariHaritasi, kullaniciFavoriHaritasi } from "@/lib/favori";
import { SiteHeader } from "@/components/SiteHeader";
import { MagazaHero } from "./MagazaHero";
import { MagazaIcerik } from "./MagazaIcerik";
import { MagazaSikayetButonu } from "./MagazaSikayetButonu";

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

  // KP-1: vitrin girissiz herkese acik (kesif serbest); yalniz "Rezerve Et" giris
  // ister. Kartlara giris durumu + kullanicinin kayitli telefonu olup olmadigi
  // gecilir (telefon yoksa ilk rezervasyonda bir kerelik istenecek).
  const session = await auth();
  const girisli = !!session?.user?.id;
  let kullaniciTelefonVar = false;
  if (session?.user?.id) {
    const kullanici = await prisma.kullanici.findUnique({
      where: { id: session.user.id },
      select: { telefon: true },
    });
    kullaniciTelefonVar = !!kullanici?.telefon;
  }

  // 'doldu' urunler de listelenir (buton kapali olarak) - kapasitesi dolan
  // urun vitrinden kaybolmamali, alici dolu oldugunu gormeli. 'satildi' ve
  // silinmis urunler gizli kalir.
  const urunler = await prisma.urun.findMany({
    where: { magazaId: magaza.id, durum: { in: ["sergide", "doldu"] }, silindiMi: false },
    include: { kategori: true },
    orderBy: { createdAt: "desc" },
  });

  // N+1 onlemek icin TEK toplu sorgu + Map (aliciGuvenilirlikHaritasi ile ayni
  // desen, bkz. rezervasyon.ts). Begeni sayisi herkese acik (girissiz de dahil),
  // "benim begenim/takibim" sadece girisliyse dolu gelir (kullaniciId yoksa
  // haritalar bos doner).
  const urunIdler = urunler.map((u) => u.id);
  const [begeniSayilari, benimFavorilerim] = await Promise.all([
    begeniSayilariHaritasi(urunIdler),
    kullaniciFavoriHaritasi(session?.user?.id, urunIdler),
  ]);

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
          <MagazaSikayetButonu girisli={girisli} magazaId={magaza.id} magazaAd={magaza.ad} />
        </div>

        <MagazaIcerik
          girisli={girisli}
          kullaniciTelefonVar={kullaniciTelefonVar}
          magazaSlug={magaza.slug}
          urunler={urunler.map((urun) => ({
            id: urun.id,
            baslik: urun.baslik,
            aciklama: urun.aciklama,
            fiyat: Number(urun.fiyat),
            durum: urun.durum,
            fotograflar: urun.fotograflar,
            kategori: { id: urun.kategori.id, ad: urun.kategori.ad },
            begeniSayisi: begeniSayilari.get(urun.id) ?? 0,
            benimBegenimVar: benimFavorilerim.get(urun.id)?.begeniMi ?? false,
            benimTakibimVar: benimFavorilerim.get(urun.id)?.takipMi ?? false,
          }))}
        />
      </main>
    </div>
  );
}
