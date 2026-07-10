import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/yetki";
import { platformAyarlariGetir } from "@/lib/platform-ayarlari";
import { SiteHeader } from "@/components/SiteHeader";
import { AdminNav } from "../AdminNav";
import { PlatformAyarlariForm } from "./PlatformAyarlariForm";

export default async function AdminAyarlarPage() {
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
    const ayarlar = await platformAyarlariGetir();

    icerik = (
      <>
        <h1 className="text-xl font-bold text-neutral-900">Platform Ayarları</h1>
        <AdminNav aktif="ayarlar" />
        <div className="mt-4 max-w-md">
          <PlatformAyarlariForm
            guvenilirlikEsigi={ayarlar.guvenilirlikEsigi}
            maxYedek={ayarlar.maxYedek}
            yasakSuresiGun={ayarlar.yasakSuresiGun}
          />
        </div>
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
