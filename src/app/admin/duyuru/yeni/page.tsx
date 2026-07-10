import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/yetki";
import { SiteHeader } from "@/components/SiteHeader";
import { AdminNav } from "../../AdminNav";
import { DuyuruForm } from "../DuyuruForm";

export default async function AdminDuyuruYeniPage() {
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
        <h1 className="text-xl font-bold text-neutral-900">Yeni Duyuru</h1>
        <AdminNav aktif="duyuru" />
        <Link href="/admin/duyuru" className="mt-3 inline-block text-sm text-primary-600 hover:underline">
          ← Duyurulara dön
        </Link>
        <p className="mt-2 text-sm text-neutral-500">
          Önce taslak olarak kaydedilir; sonra &quot;Yayınla&quot; ile hedef kitleye gönderirsin.
        </p>
        <div className="mt-4 max-w-2xl">
          <DuyuruForm duyuru={null} />
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
