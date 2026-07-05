import { redirect } from "next/navigation";
import { getSaticiSession } from "@/lib/yetki";
import { getOwnMagaza } from "@/lib/magaza";
import { SiteHeader } from "@/components/SiteHeader";
import { MagazaQrKart } from "./MagazaQrKart";

export default async function MagazaQrPage() {
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
          <p className="mt-1 text-neutral-600">
            QR kodunu oluşturmadan önce bir mağaza oluşturman gerekiyor.
          </p>
        </>
      );
    } else {
      icerik = (
        <>
          <div className="print:hidden">
            <h1 className="text-xl font-bold text-neutral-900">Mağaza QR Kodu</h1>
            <p className="mt-1 text-sm text-neutral-600">
              Yazdırıp tezgahına koy — okutan doğrudan mağaza sayfana gider.
            </p>
          </div>
          <div className="mt-4">
            <MagazaQrKart ad={magaza.ad} slug={magaza.slug} />
          </div>
        </>
      );
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="print:hidden">
        <SiteHeader />
      </div>
      <main className="mx-auto max-w-md px-4 py-6">{icerik}</main>
    </div>
  );
}
