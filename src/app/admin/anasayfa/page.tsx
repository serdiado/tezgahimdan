import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/yetki";
import { sayfaModulleriGetir } from "@/lib/sayfa-modulu";
import { siteIcerikHaritasiGetir } from "@/lib/site-icerik";
import { SiteHeader } from "@/components/SiteHeader";
import { AdminNav } from "../AdminNav";
import { HeroForm } from "./HeroForm";
import { SayfaModuluKarti, type SayfaModuluVeri } from "./SayfaModuluKarti";

const MODUL_BASLIGI: Record<string, string> = {
  haftalik_ritim: "Haftalık Pazar Ritmi",
  yeni_urunler: "Yeni Ürünler",
  en_cok_begenilen: "En Çok Beğenilenler",
  magaza_listesi: "Tezgahlar",
};

const HERO_ANAHTARLARI = [
  "anasayfa_hero_baslik",
  "anasayfa_hero_aciklama",
  "anasayfa_hero_cta_metni",
  "anasayfa_hero_cta_link",
  "anasayfa_hero_gorsel",
];

export default async function AdminAnasayfaPage() {
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
    const [moduller, hero] = await Promise.all([
      sayfaModulleriGetir("anasayfa"),
      siteIcerikHaritasiGetir(HERO_ANAHTARLARI),
    ]);

    const modulVerileri: SayfaModuluVeri[] = moduller.map((m, index) => {
      const ayarlarRaw = m.ayarlar as { kolonSayisi?: 3 | 4; sunumTipi?: "grid" | "slider"; ogeSayisi?: number };
      const izgaraModuluMu = m.tur !== "haftalik_ritim";
      return {
        sayfa: "anasayfa" as const,
        tur: m.tur,
        baslik: MODUL_BASLIGI[m.tur] ?? m.tur,
        aktifMi: m.aktifMi,
        aktifEtiketi: "Anasayfada göster",
        ilkMi: index === 0,
        sonMi: index === moduller.length - 1,
        // ogeSayisi input'u ARTIK her izgara modulunde gorunur: `?? 12` olmadan
        // JSON'da anahtar yoksa input hic cizilmiyordu (kart `!== undefined`
        // kosuluyla gosteriyor). Eskiden bu, ayarlar JSON'unu ezen update
        // hatasiyla birlesince ayari kalici olarak kaybettiriyordu (bkz.
        // api/admin/sayfa-modulu-guncelle route yorumu).
        ayarlar: izgaraModuluMu
          ? { kolonSayisi: ayarlarRaw.kolonSayisi ?? 3, sunumTipi: ayarlarRaw.sunumTipi, ogeSayisi: ayarlarRaw.ogeSayisi ?? 12 }
          : undefined,
        // Mağaza listesinde slider secenegi yok (magaza karti daha genis, grid'de daha iyi durur) - kolon secimi hala var.
        sunumSecenegiVar: m.tur === "yeni_urunler" || m.tur === "en_cok_begenilen",
        not:
          m.tur === "magaza_listesi"
            ? "Anasayfadaki tezgah önizlemesinde kaç tezgah gösterileceği. Tam liste pazarın kendi sayfasındadır."
            : m.tur === "yeni_urunler"
              ? "Sayfa boyu: “Daha Fazla Göster” her basışta bu kadar ürün ekler. Pazar sayfaları da bu ayarı kullanır."
              : undefined,
      };
    });

    icerik = (
      <>
        <h1 className="text-xl font-bold text-neutral-900">Anasayfa Görünümü</h1>
        <AdminNav aktif="anasayfa" />

        <div className="mt-4 max-w-2xl">
          <HeroForm
            baslik={hero.get("anasayfa_hero_baslik") ?? ""}
            aciklama={hero.get("anasayfa_hero_aciklama") ?? ""}
            ctaMetni={hero.get("anasayfa_hero_cta_metni") ?? ""}
            ctaLink={hero.get("anasayfa_hero_cta_link") ?? ""}
            gorselUrl={hero.get("anasayfa_hero_gorsel") ?? null}
          />
        </div>

        <div className="mt-6 max-w-2xl">
          <h2 className="font-semibold text-neutral-900">Modüller</h2>
          <p className="mt-1 text-xs text-neutral-500">
            Sıralama, görünürlük ve görünüm ayarları — değişiklikler anında anasayfaya yansır.
          </p>
          <div className="mt-3 space-y-3">
            {modulVerileri.map((m) => (
              <SayfaModuluKarti key={m.tur} modul={m} />
            ))}
          </div>
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
