import { notFound, redirect } from "next/navigation";
import { getAdminSession } from "@/lib/yetki";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/SiteHeader";
import { AdminNav } from "../../../AdminNav";
import { PazarForm } from "../../PazarForm";

export default async function PazarDuzenlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
    const pazar = await prisma.pazar.findUnique({ where: { id } });
    if (!pazar) {
      notFound();
    }

    icerik = (
      <>
        <h1 className="text-xl font-bold text-neutral-900">Pazar Düzenle — {pazar.ad}</h1>
        <AdminNav aktif="pazarlar" />
        <PazarForm
          mevcut={{
            id: pazar.id,
            ad: pazar.ad,
            bolge: pazar.bolge,
            baslangicGunu: pazar.baslangicGunu,
            baslangicSaati: pazar.baslangicSaati.toISOString(),
            sifirlamaGunu: pazar.sifirlamaGunu,
            sifirlamaSaati: pazar.sifirlamaSaati.toISOString(),
            saatDilimi: pazar.saatDilimi,
            aktifMi: pazar.aktifMi,
          }}
        />
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
