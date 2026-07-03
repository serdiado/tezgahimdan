import Link from "next/link";
import { redirect } from "next/navigation";
import { PackagePlus, ClipboardList, Package, Store } from "lucide-react";
import { getSaticiSession } from "@/lib/yetki";
import { SiteHeader } from "@/components/SiteHeader";

export default async function PanelSayfasi() {
  const { session, yetkili } = await getSaticiSession();
  if (!session) {
    redirect("/giris");
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-6">
        {!yetkili ? (
          <>
            <h1 className="text-xl font-bold text-neutral-900">Yetkisiz Erişim</h1>
            <p className="mt-1 text-neutral-600">Bu sayfaya sadece satıcı hesapları erişebilir.</p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-neutral-900">Panelim</h1>
            <p className="mt-1 text-neutral-600">Merhaba {session.user.name}, ne yapmak istersin?</p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Link
                href="/panel/urunlerim"
                className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <Package className="h-8 w-8 text-primary-600" strokeWidth={1.75} />
                <div>
                  <p className="font-semibold text-neutral-900">Ürünlerim</p>
                  <p className="text-sm text-neutral-500">Listele, düzenle, kaldır</p>
                </div>
              </Link>
              <Link
                href="/panel/urun-ekle"
                className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <PackagePlus className="h-8 w-8 text-primary-600" strokeWidth={1.75} />
                <div>
                  <p className="font-semibold text-neutral-900">Ürün Ekle</p>
                  <p className="text-sm text-neutral-500">Yeni ürün sergile</p>
                </div>
              </Link>
              <Link
                href="/panel/rezervasyonlar"
                className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <ClipboardList className="h-8 w-8 text-primary-600" strokeWidth={1.75} />
                <div>
                  <p className="font-semibold text-neutral-900">Gelen Rezervasyonlar</p>
                  <p className="text-sm text-neutral-500">Satıldı / Gelmedi işaretle</p>
                </div>
              </Link>
              <Link
                href="/panel/magaza-ayarlari"
                className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <Store className="h-8 w-8 text-primary-600" strokeWidth={1.75} />
                <div>
                  <p className="font-semibold text-neutral-900">Mağaza Ayarları</p>
                  <p className="text-sm text-neutral-500">Ad, açıklama, WhatsApp</p>
                </div>
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
