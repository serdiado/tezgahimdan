import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSaticiSession } from "@/lib/yetki";
import { getOwnMagaza } from "@/lib/magaza";
import { SiteHeader } from "@/components/SiteHeader";
import { UrunDuzenleForm } from "./UrunDuzenleForm";

const DURUM_ETIKETI: Record<string, string> = {
  sergide: "Sergide",
  doldu: "Dolu",
  satildi: "Satıldı",
};

export default async function UrunDuzenlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, yetkili } = await getSaticiSession();

  if (!session) {
    redirect("/giris");
  }
  if (!yetkili) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <SiteHeader />
        <main className="mx-auto max-w-2xl px-4 py-6">
          <h1 className="text-xl font-bold text-neutral-900">Yetkisiz Erişim</h1>
          <p className="mt-1 text-neutral-600">Bu sayfaya sadece satıcı hesapları erişebilir.</p>
        </main>
      </div>
    );
  }

  const magaza = await getOwnMagaza(session.user.id);
  if (!magaza) {
    notFound();
  }

  // Yetki: sadece kendi magazasinin urunu - id + magazaId birlikte filtrelenir,
  // baska saticinin urunu ise "bulunamadi" (var oldugunu bile ele vermeyiz).
  const urun = await prisma.urun.findFirst({
    where: { id, magazaId: magaza.id },
  });
  if (!urun) {
    notFound();
  }

  // Kaldirilmis (silindiMi=true) kategoriler secenek olarak sunulmaz. Urunun
  // MEVCUT kategorisi kaldirilmissa listede gorunmez - satici baska bir kategori
  // secmek zorunda kalir (kaldirilmis kategoriyle devam edilmesi tutarsiz olurdu).
  // minStok = sadece bekleyen (aktif, sonuclanmamis) rezervasyon sayisi -
  // gecmis 'satildi' kayitlari satis aninda zaten stogu dusurdugu icin ayrica
  // yer kaplamaz (bkz. src/lib/urun.ts urunGuncelle, ayni invariant).
  const [kategoriler, aktifSayisi] = await Promise.all([
    prisma.kategori.findMany({ where: { silindiMi: false }, orderBy: [{ sira: "asc" }, { ad: "asc" }] }),
    prisma.rezervasyon.count({ where: { urunId: urun.id, durum: "bekliyor", tip: "aktif" } }),
  ]);

  return (
    <div className="min-h-screen bg-neutral-50">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <div className="flex items-baseline justify-between">
          <h1 className="text-xl font-bold text-neutral-900">Ürün Düzenle</h1>
          <span className="rounded-full bg-neutral-200 px-2.5 py-0.5 text-xs font-semibold text-neutral-600">
            {DURUM_ETIKETI[urun.durum] ?? urun.durum}
          </span>
        </div>
        <div className="mt-4">
          <UrunDuzenleForm
            urun={{
              id: urun.id,
              kategoriId: urun.kategoriId,
              baslik: urun.baslik,
              aciklama: urun.aciklama,
              fiyat: Number(urun.fiyat),
              stokAdedi: urun.stokAdedi,
              fotograflar: urun.fotograflar,
            }}
            kategoriler={kategoriler.map((k) => ({ id: k.id, ad: k.ad }))}
            minStok={aktifSayisi}
          />
        </div>
      </main>
    </div>
  );
}
