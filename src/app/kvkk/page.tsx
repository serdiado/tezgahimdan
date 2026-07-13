import type { Metadata } from "next";
import Link from "next/link";
import { siteIcerikHaritasiGetir } from "@/lib/site-icerik";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Aydınlatma Metni · Tezgahımdan",
};

// Admin panelden (/admin/icerik) her an duzenlenebilir CMS icerigi - build
// aninda statik olarak dondurulursa admin degisikligi yayina yansimaz, ayrica
// build ortaminda gercek DATABASE_URL olmayabilir (bkz. Docker production build).
export const dynamic = "force-dynamic";

// Taslak sayfa (PLAN.md SS7 "Hafif hukuk" notu): telefon numarasi sakladigimiz
// icin bir link/route simdiden var olsun, ama gercek hukuki metin gelene kadar
// bunu acikca "hazirlaniyor" diye belirtiyoruz - sahte/placeholder metni gercek
// aydinlatma metni gibi sunmuyoruz. Faz 4.4: admin /admin/icerik'ten gercek
// metni girdiginde bu varsayilan uyari otomatik olarak gercek metinle degisir.
export default async function KvkkSayfasi() {
  const icerik = await siteIcerikHaritasiGetir(["kvkk_icerik"]);
  const govde = icerik.get("kvkk_icerik");

  return (
    <div className="min-h-screen bg-neutral-50">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-xl font-bold text-neutral-900">
          Kişisel Verilerin Korunması (KVKK) Aydınlatma Metni
        </h1>
        {govde ? (
          <p className="mt-4 whitespace-pre-line text-neutral-700">{govde}</p>
        ) : (
          <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            Bu metin hazırlanıyor. Şu an platformda kayıtlı kişisel veriler (ad ve
            telefon numaran) yalnızca rezervasyon sürecini yürütmek için kullanılır;
            tam aydınlatma metni yayınlandığında bu sayfa güncellenecektir.
          </p>
        )}

        {/* Hesap silme hakki: CMS metninden BAGIMSIZ, her zaman gorunur -
            islevsel bir hak, hukuki metnin hazir olmasini beklemez. 2026-07-13
            karari: self-servis silme degil, uygulama-ici TALEP (Ayarlar/Tezgah
            Ayarlari'ndaki "Hesabımı Sil" butonu -> admin'e bildirim -> admin
            isleme alir, bkz. lib/hesap-silme.ts). Onceki surumde bu metin
            "SSS sayfasindaki iletisim kanali"na atif yapiyordu - o kanal hic
            var olmadigi icin (SSS CMS icerigi bos) gercek, tiklanan bir yola
            degistirildi. */}
        <h2 className="mt-8 text-lg font-bold text-neutral-900">Hesabımı Sildirmek İstiyorum</h2>
        <p className="mt-2 text-neutral-700">
          Hesabını ve kişisel verilerini sildirmek istersen, giriş yaptıktan sonra{" "}
          <span className="font-semibold">Ayarlar</span> sayfandaki (bir tezgahın varsa{" "}
          <span className="font-semibold">Tezgah Ayarları</span> sayfandaki) &quot;Hesabımı Sil&quot;
          butonuyla talebini yöneticimize iletebilirsin —{" "}
          <Link href="/ayarlar" className="font-semibold text-primary-600 hover:underline">
            buradan ulaşabilirsin
          </Link>
          . Talebin üzerine hesabın yönetici tarafından kapatılır; adın, telefon numaran ve
          e-posta adresin sistemden <span className="font-semibold">anonimleştirilerek</span>{" "}
          kaldırılır ve hesabınla bir daha giriş yapılamaz. Geçmiş rezervasyon ve değerlendirme
          kayıtları, platform bütünlüğü için kişisel bilgi içermeden (anonim olarak) saklanır.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
