import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/yetki";
import { SiteHeader } from "@/components/SiteHeader";
import { AdminNav } from "../../AdminNav";
import { PazarForm } from "../PazarForm";

export default async function YeniPazarPage() {
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
    icerik = (
      <>
        <h1 className="text-xl font-bold text-neutral-900">Yeni Pazar</h1>
        <AdminNav aktif="pazarlar" />
        <PazarForm />
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
