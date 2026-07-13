import { redirect } from "next/navigation";
import { getSaticiSession } from "@/lib/yetki";
import { getOwnMagaza } from "@/lib/magaza";
import { SiteHeader } from "@/components/SiteHeader";
import { MagazaAyarlariForm } from "./MagazaAyarlariForm";

export default async function MagazaAyarlariPage({
  searchParams,
}: {
  searchParams: Promise<{ hata?: string; basarili?: string; kurulum?: string }>;
}) {
  const { hata, basarili, kurulum } = await searchParams;
  // Kurulum modu (2026-07-11 akis karari): tezgah acilir acilmaz sihirbaz
  // buraya yonlendirir - satici once tezgahini tanitir (istege bagli alanlar),
  // sonra ilk urununu ekler. Dogrudan urun-ekle'ye atlanmaz.
  const kurulumModu = kurulum === "1";
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
          <h1 className="text-xl font-bold text-neutral-900">Önce Tezgahını Oluştur</h1>
          <p className="mt-1 text-neutral-600">
            Tezgah ayarlarını düzenlemeden önce bir tezgah oluşturman gerekiyor.
          </p>
        </>
      );
    } else {
      icerik = (
        <>
          {kurulumModu && (
            <div className="mb-4 rounded-lg bg-primary-600 p-4 text-white">
              <p className="text-base font-bold">Tezgahın açıldı!</p>
              <p className="mt-1 text-sm text-primary-100">
                Şimdi tezgahını tanıt: alıcılar seni pazarda kolay bulsun. Bu bilgileri
                istersen sonra da doldurabilirsin — ardından ilk ürününü ekleyeceksin.
              </p>
            </div>
          )}
          <h1 className="text-xl font-bold text-neutral-900">
            {kurulumModu ? "Tezgahını Tanıt" : "Tezgah Ayarları"}
          </h1>
          {hata && <p className="mt-2 text-sm text-red-600">{hata}</p>}
          {basarili && <p className="mt-2 text-sm text-green-600">Kaydedildi.</p>}
          <MagazaAyarlariForm
            kurulumModu={kurulumModu}
            magaza={{
              ad: magaza.ad,
              slug: magaza.slug,
              aciklama: magaza.aciklama,
              whatsappNo: magaza.whatsappNo,
              tezgahBilgisi: magaza.tezgahBilgisi,
              krokiFotoUrl: magaza.krokiFotoUrl,
              instagramUrl: magaza.instagramUrl,
              facebookUrl: magaza.facebookUrl,
              tiktokUrl: magaza.tiktokUrl,
            }}
          />
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
