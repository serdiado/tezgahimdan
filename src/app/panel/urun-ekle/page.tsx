import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSaticiSession } from "@/lib/yetki";
import { getOwnMagaza } from "@/lib/magaza";
import { SiteHeader } from "@/components/SiteHeader";
import { MagazaOlusturForm } from "./MagazaOlusturForm";
import { UrunEkleForm } from "./UrunEkleForm";

export default async function UrunEklePage({
  searchParams,
}: {
  searchParams: Promise<{ hata?: string }>;
}) {
  const { hata } = await searchParams;
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
      // Admin panelinden eklenen tum aktif pazarlar - magaza-ac/page.tsx ile
      // ayni desen, gercek pazar secimi icin (varsayilan-pazar fallback'i yok).
      const pazarlar = await prisma.pazar.findMany({
        where: { aktifMi: true },
        orderBy: { createdAt: "asc" },
      });
      icerik = (
        <>
          <h1 className="text-xl font-bold text-neutral-900">Önce Tezgahını Oluştur</h1>
          {hata && <p className="mt-1 text-red-600">{hata}</p>}
          <div className="mt-4">
            {pazarlar.length === 0 ? (
              <p className="mt-4 rounded-lg border border-neutral-200 p-3 text-sm text-neutral-600">
                Şu anda aktif bir pazar yok, bu yüzden tezgah açılamıyor. Lütfen daha sonra tekrar
                deneyin.
              </p>
            ) : (
              <MagazaOlusturForm
                pazarlar={pazarlar.map((p) => ({ id: p.id, ad: p.ad, il: p.il, ilce: p.ilce }))}
              />
            )}
          </div>
        </>
      );
    } else {
      // Kaldirilmis (admin tarafindan silindiMi=true yapilmis) kategoriler yeni
      // urunlerde secilemez - AP-4'ten sonra ortaya cikan tutarlilik geregi.
      // Ilk-urun kutlamasi (2026-07-13): tezgahin HIC urunu yoksa basari
      // ekrani "Tezgahin yayinda!" der ve tezgah sayfasina goturur - satici
      // emeginin karsiligini aninda gorsun (onboarding motivasyonu).
      const [kategoriler, urunSayisi] = await Promise.all([
        prisma.kategori.findMany({
          where: { silindiMi: false },
          orderBy: [{ sira: "asc" }, { ad: "asc" }],
        }),
        prisma.urun.count({ where: { magazaId: magaza.id, silindiMi: false } }),
      ]);
      icerik = (
        <>
          <h1 className="text-xl font-bold text-neutral-900">Ürün Ekle — {magaza.ad}</h1>
          <div className="mt-4">
            <UrunEkleForm
              kategoriler={kategoriler.map((k) => ({ id: k.id, ad: k.ad }))}
              magazaSlug={magaza.slug}
              ilkUrunMu={urunSayisi === 0}
            />
          </div>
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
