import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/yetki";
import { siteIcerikHaritasiGetir } from "@/lib/site-icerik";
import { SiteHeader } from "@/components/SiteHeader";
import { AdminNav } from "../AdminNav";
import { IcerikBolumuForm } from "./IcerikBolumuForm";

const TUM_ANAHTARLAR = [
  "footer_slogan",
  "footer_aciklama",
  "hakkimizda_baslik",
  "hakkimizda_icerik",
  "sss_icerik",
  "kvkk_icerik",
];

export default async function AdminIcerikPage() {
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
    const veri = await siteIcerikHaritasiGetir(TUM_ANAHTARLAR);
    const d = (anahtar: string) => veri.get(anahtar) ?? "";

    icerik = (
      <>
        <h1 className="text-xl font-bold text-neutral-900">İçerik Yönetimi</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Sitenin alt bilgisi ve statik sayfaları — boş bırakılan alanlar varsayılan/hazırlanıyor metnini
          gösterir.
        </p>
        <AdminNav aktif="icerik" />

        <div className="mt-4 max-w-2xl space-y-4">
          <IcerikBolumuForm
            baslik="Footer"
            alanlar={[
              { anahtar: "footer_slogan", etiket: "Slogan", deger: d("footer_slogan"), placeholder: "Üreten Kadın'ın Tezgahı" },
              {
                anahtar: "footer_aciklama",
                etiket: "Açıklama",
                deger: d("footer_aciklama"),
                cokSatirli: true,
                placeholder: "Tezgahımdan hakkında kısa bir paragraf",
              },
            ]}
          />

          <IcerikBolumuForm
            baslik="Hakkımızda (/hakkimizda)"
            alanlar={[
              { anahtar: "hakkimizda_baslik", etiket: "Başlık", deger: d("hakkimizda_baslik"), placeholder: "Hakkımızda" },
              { anahtar: "hakkimizda_icerik", etiket: "İçerik", deger: d("hakkimizda_icerik"), cokSatirli: true },
            ]}
          />

          <IcerikBolumuForm
            baslik="Sıkça Sorulan Sorular (/sss)"
            alanlar={[{ anahtar: "sss_icerik", etiket: "İçerik", deger: d("sss_icerik"), cokSatirli: true }]}
          />

          <IcerikBolumuForm
            baslik="KVKK Aydınlatma Metni (/kvkk)"
            not="Boş bırakılırsa sayfada 'metin hazırlanıyor' uyarısı gösterilmeye devam eder."
            alanlar={[{ anahtar: "kvkk_icerik", etiket: "İçerik", deger: d("kvkk_icerik"), cokSatirli: true }]}
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
