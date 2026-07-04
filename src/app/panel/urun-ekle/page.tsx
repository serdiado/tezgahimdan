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
      icerik = (
        <>
          <h1 className="text-xl font-bold text-neutral-900">Önce Mağazanı Oluştur</h1>
          {hata && <p className="mt-1 text-red-600">{hata}</p>}
          <div className="mt-4">
            <MagazaOlusturForm />
          </div>
        </>
      );
    } else {
      // Kaldirilmis (admin tarafindan silindiMi=true yapilmis) kategoriler yeni
      // urunlerde secilemez - AP-4'ten sonra ortaya cikan tutarlilik geregi.
      const kategoriler = await prisma.kategori.findMany({
        where: { silindiMi: false },
        orderBy: { ad: "asc" },
      });
      icerik = (
        <>
          <h1 className="text-xl font-bold text-neutral-900">Ürün Ekle — {magaza.ad}</h1>
          <div className="mt-4">
            <UrunEkleForm
              kategoriler={kategoriler.map((k) => ({ id: k.id, ad: k.ad }))}
              magazaSlug={magaza.slug}
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
