import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/yetki";
import { sayfaModulleriGetir } from "@/lib/sayfa-modulu";
import { SiteHeader } from "@/components/SiteHeader";
import { AdminNav } from "../AdminNav";
import { SayfaModuluKarti, type SayfaModuluVeri } from "../anasayfa/SayfaModuluKarti";

const BILESEN_BASLIGI: Record<string, string> = {
  magaza_hero_whatsapp: "WhatsApp Butonu",
  magaza_hero_kroki: "Kroki / Tezgah Fotoğrafı",
  magaza_hero_puan: "Ortalama Puan Rozeti",
};

export default async function AdminMagazaSablonuPage() {
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
    const bilesenler = await sayfaModulleriGetir("magaza_hero");

    const bilesenVerileri: SayfaModuluVeri[] = bilesenler.map((b, index) => ({
      sayfa: "magaza_hero" as const,
      tur: b.tur,
      baslik: BILESEN_BASLIGI[b.tur] ?? b.tur,
      aktifMi: b.aktifMi,
      aktifEtiketi: "Tezgah sayfasında göster",
      ilkMi: index === 0,
      sonMi: index === bilesenler.length - 1,
      ayarlar: undefined,
      sunumSecenegiVar: false,
    }));

    icerik = (
      <>
        <h1 className="text-xl font-bold text-neutral-900">Tezgah Sayfası Şablonu</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Bu sıra/görünürlük ayarı <span className="font-semibold">tüm tezgahlar</span> için geçerli tek bir
          şablon kararıdır — tekil tezgah içeriği (ad, açıklama, WhatsApp numarası vb.) hâlâ satıcının kendi
          panelinden yönetilir.
        </p>
        <AdminNav aktif="magaza-sablonu" />

        <div className="mt-4 max-w-2xl space-y-3">
          {bilesenVerileri.map((b) => (
            <SayfaModuluKarti key={b.tur} modul={b} />
          ))}
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
