import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAdminSession } from "@/lib/yetki";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/SiteHeader";
import { AdminNav } from "../../../../AdminNav";
import { AdminUrunDuzenleForm } from "./AdminUrunDuzenleForm";
import { UrunGeriGetirButonu } from "../../UrunGeriGetirButonu";

const DURUM_ETIKETI: Record<string, string> = {
  sergide: "Sergide",
  doldu: "Dolu",
  satildi: "Satıldı",
};

export default async function AdminUrunDuzenlePage({
  params,
}: {
  params: Promise<{ id: string; urunId: string }>;
}) {
  const { id, urunId } = await params;
  const { session, yetkili } = await getAdminSession();
  if (!session) {
    redirect("/giris");
  }

  let icerik;
  if (!yetkili) {
    icerik = (
      <>
        <h1 className="text-xl font-bold text-neutral-900">Yetkisiz Erişim</h1>
        <p className="mt-1 text-neutral-600">Bu sayfaya sadece yönetici hesapları erişebilir.</p>
      </>
    );
  } else {
    const magaza = await prisma.magaza.findUnique({ where: { id }, select: { id: true, ad: true } });
    if (!magaza) {
      notFound();
    }

    // urunId + magazaId birlikte dogrulanir - URL'deki magaza ile urunun
    // gercek sahibi tutarsizsa (ör. eski/yanlis link) "bulunamadi" gosterilir.
    const urun = await prisma.urun.findFirst({ where: { id: urunId, magazaId: id } });
    if (!urun) {
      notFound();
    }

    const [kategoriler, aktifSayisi, satildiSayisi] = await Promise.all([
      prisma.kategori.findMany({ where: { silindiMi: false }, orderBy: [{ sira: "asc" }, { ad: "asc" }] }),
      prisma.rezervasyon.count({ where: { urunId: urun.id, durum: "bekliyor", tip: "aktif" } }),
      prisma.rezervasyon.count({ where: { urunId: urun.id, durum: "satildi" } }),
    ]);

    icerik = (
      <>
        <div className="flex items-baseline justify-between">
          <h1 className="text-xl font-bold text-neutral-900">Ürün Düzenle — {magaza.ad}</h1>
          <span className="rounded-full bg-neutral-200 px-2.5 py-0.5 text-xs font-semibold text-neutral-600">
            {DURUM_ETIKETI[urun.durum] ?? urun.durum}
          </span>
        </div>
        <AdminNav aktif="magazalar" />
        <Link href={`/admin/magazalar/${magaza.id}`} className="mt-3 inline-block text-sm text-primary-600 hover:underline">
          ← {magaza.ad} sayfasına dön
        </Link>
        {urun.silindiMi ? (
          <div className="mt-4 max-w-2xl rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-neutral-700">
              <span className="font-semibold">{urun.baslik}</span> kaldırılmış durumda. Düzenlemek için
              önce geri getirmen gerekiyor.
            </p>
            <div className="mt-3">
              <UrunGeriGetirButonu urunId={urun.id} />
            </div>
          </div>
        ) : (
          <div className="mt-4 max-w-2xl">
            <AdminUrunDuzenleForm
              magazaId={magaza.id}
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
              minStok={aktifSayisi + satildiSayisi}
            />
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-6">{icerik}</main>
    </div>
  );
}
