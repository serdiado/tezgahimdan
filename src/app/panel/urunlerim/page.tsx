import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSaticiSession } from "@/lib/yetki";
import { getOwnMagaza } from "@/lib/magaza";
import { SiteHeader } from "@/components/SiteHeader";
import { UrunKartiPanel } from "./UrunKartiPanel";

export default async function UrunlerimPage({
  searchParams,
}: {
  searchParams: Promise<{ kaldirilanlar?: string }>;
}) {
  const { kaldirilanlar } = await searchParams;
  const kaldirilanlarGosteriliyor = kaldirilanlar === "1";
  const { session, yetkili } = await getSaticiSession();

  if (!session) {
    redirect("/giris");
  }

  let icerik;
  if (!yetkili) {
    icerik = (
      <>
        <h1 className="text-xl font-bold text-neutral-900">Yetkisiz Erişim</h1>
        <p className="mt-1 text-neutral-600">Bu sayfaya sadece satıcı hesapları erişebilir.</p>
      </>
    );
  } else {
    const magaza = await getOwnMagaza(session.user.id);
    if (!magaza) {
      icerik = (
        <>
          <h1 className="text-xl font-bold text-neutral-900">Henüz Mağazanız Yok</h1>
          <p className="mt-1 text-neutral-600">
            Ürün eklemek için önce{" "}
            <Link href="/panel/urun-ekle" className="text-primary-600 underline">
              mağazanı oluştur
            </Link>
            .
          </p>
        </>
      );
    } else {
      // Yetki sinifi: SADECE bu saticinin kendi magazasinin urunleri cekilir.
      // Varsayilan gorunum silindiMi=false; 'Kaldirilanlar' filtresiyle diger
      // taraf (silindiMi=true) gorulur.
      const urunler = await prisma.urun.findMany({
        where: { magazaId: magaza.id, silindiMi: kaldirilanlarGosteriliyor },
        include: {
          kategori: { select: { ad: true } },
          rezervasyonlar: { where: { durum: "bekliyor" }, select: { id: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      icerik = (
        <>
          <div className="flex items-baseline justify-between">
            <h1 className="text-xl font-bold text-neutral-900">Ürünlerim</h1>
            <Link
              href={kaldirilanlarGosteriliyor ? "/panel/urunlerim" : "/panel/urunlerim?kaldirilanlar=1"}
              className="text-sm font-medium text-primary-600 hover:underline"
            >
              {kaldirilanlarGosteriliyor ? "Aktif ürünlere dön" : "Kaldırılanlar"}
            </Link>
          </div>

          {urunler.length === 0 ? (
            <p className="mt-4 text-neutral-600">
              {kaldirilanlarGosteriliyor ? "Kaldırılmış ürün yok." : "Henüz ürününüz yok."}
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {urunler.map((urun) => (
                <UrunKartiPanel
                  key={urun.id}
                  urun={{
                    id: urun.id,
                    baslik: urun.baslik,
                    kategoriAd: urun.kategori.ad,
                    fiyat: Number(urun.fiyat),
                    stokAdedi: urun.stokAdedi,
                    durum: urun.durum,
                    fotograf: urun.fotograflar[0] ?? null,
                    bekleyenSayisi: urun.rezervasyonlar.length,
                    silindiMi: urun.silindiMi,
                  }}
                />
              ))}
            </div>
          )}
        </>
      );
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-6">{icerik}</main>
    </div>
  );
}
