import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAdminSession } from "@/lib/yetki";
import { prisma } from "@/lib/prisma";
import { duyuruOkunmaSayisi } from "@/lib/duyuru";
import { SiteHeader } from "@/components/SiteHeader";
import { AdminNav } from "../../../AdminNav";
import { DuyuruForm } from "../../DuyuruForm";

export default async function AdminDuyuruDuzenlePage({ params }: { params: Promise<{ id: string }> }) {
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
    const duyuru = await prisma.duyuru.findFirst({
      where: { id, silindiMi: false },
      select: {
        id: true,
        baslik: true,
        govde: true,
        tur: true,
        hedefKitle: true,
        gorselUrl: true,
        yayinlandiMi: true,
        gonderilenSayisi: true,
      },
    });
    if (!duyuru) {
      notFound();
    }
    const okunanSayisi = duyuru.yayinlandiMi ? await duyuruOkunmaSayisi(duyuru.id) : 0;

    icerik = (
      <>
        <h1 className="text-xl font-bold text-neutral-900">Duyuruyu Düzenle</h1>
        <AdminNav aktif="duyuru" />
        <Link href="/admin/duyuru" className="mt-3 inline-block text-sm text-primary-600 hover:underline">
          ← Duyurulara dön
        </Link>
        <div className="mt-4 max-w-2xl">
          <DuyuruForm
            duyuru={{
              id: duyuru.id,
              baslik: duyuru.baslik,
              govde: duyuru.govde,
              tur: duyuru.tur,
              hedefKitle: duyuru.hedefKitle as "hepsi" | "satici" | "alici",
              gorselUrl: duyuru.gorselUrl,
              yayinlandiMi: duyuru.yayinlandiMi,
              gonderilenSayisi: duyuru.gonderilenSayisi,
              okunanSayisi,
            }}
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
