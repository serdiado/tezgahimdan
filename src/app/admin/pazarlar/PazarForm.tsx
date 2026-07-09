"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HAFTA_GUNLERI, saatMetnineCevir } from "./pazar-yardimcilari";

export type PazarFormVeri = {
  id: string;
  ad: string;
  il: string;
  ilce: string;
  semt: string | null;
  googleHaritaLinki: string;
  baslangicGunu: string;
  baslangicSaati: string;
  sifirlamaGunu: string;
  sifirlamaSaati: string;
  saatDilimi: string;
  aktifMi: boolean;
};

const inputClass =
  "mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500";

// Hem "Yeni Pazar" hem "Pazar Düzenle" sayfaları bu formu kullanır. Yeni pazarda
// aktifMi alanı gösterilmez (yeni pazar hep aktif başlar); düzenlemede gösterilir.
export function PazarForm({ mevcut }: { mevcut?: PazarFormVeri }) {
  const router = useRouter();
  const duzenlemeModu = !!mevcut;
  const [ad, setAd] = useState(mevcut?.ad ?? "");
  const [il, setIl] = useState(mevcut?.il ?? "");
  const [ilce, setIlce] = useState(mevcut?.ilce ?? "");
  const [semt, setSemt] = useState(mevcut?.semt ?? "");
  const [googleHaritaLinki, setGoogleHaritaLinki] = useState(mevcut?.googleHaritaLinki ?? "");
  const [baslangicGunu, setBaslangicGunu] = useState(mevcut?.baslangicGunu ?? "Carsamba");
  const [baslangicSaati, setBaslangicSaati] = useState(
    mevcut ? saatMetnineCevir(mevcut.baslangicSaati) : "09:00",
  );
  const [sifirlamaGunu, setSifirlamaGunu] = useState(mevcut?.sifirlamaGunu ?? "Carsamba");
  const [sifirlamaSaati, setSifirlamaSaati] = useState(
    mevcut ? saatMetnineCevir(mevcut.sifirlamaSaati) : "20:00",
  );
  const [saatDilimi, setSaatDilimi] = useState(mevcut?.saatDilimi ?? "Europe/Istanbul");
  const [aktifMi, setAktifMi] = useState(mevcut?.aktifMi ?? true);
  const [hata, setHata] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  async function gonder(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    setGonderiliyor(true);

    const govde = {
      ...(duzenlemeModu ? { id: mevcut.id } : {}),
      ad: ad.trim(),
      il: il.trim(),
      ilce: ilce.trim(),
      semt: semt.trim() || null,
      googleHaritaLinki: googleHaritaLinki.trim(),
      baslangicGunu,
      baslangicSaati,
      sifirlamaGunu,
      sifirlamaSaati,
      saatDilimi: saatDilimi.trim() || "Europe/Istanbul",
      ...(duzenlemeModu ? { aktifMi } : {}),
    };

    const res = await fetch(
      duzenlemeModu ? "/api/admin/pazar-guncelle" : "/api/admin/pazar-olustur",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(govde),
      },
    );
    setGonderiliyor(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setHata(data.hata ?? "işlem başarısız");
      return;
    }

    router.push("/admin/pazarlar");
    router.refresh();
  }

  return (
    <form onSubmit={gonder} className="mt-4 max-w-lg space-y-4">
      <div>
        <label className="block text-sm font-medium text-neutral-700">
          Pazar Adı
          <input
            type="text"
            value={ad}
            onChange={(e) => setAd(e.target.value)}
            required
            className={inputClass}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium text-neutral-700">
          İl
          <input
            type="text"
            value={il}
            onChange={(e) => setIl(e.target.value)}
            required
            className={inputClass}
          />
        </label>
        <label className="block text-sm font-medium text-neutral-700">
          İlçe
          <input
            type="text"
            value={ilce}
            onChange={(e) => setIlce(e.target.value)}
            required
            className={inputClass}
          />
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">
          Semt (opsiyonel)
          <input
            type="text"
            value={semt}
            onChange={(e) => setSemt(e.target.value)}
            placeholder="ör. Çarşı Mahallesi"
            className={inputClass}
          />
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">
          Google Haritası Linki
          <input
            type="url"
            value={googleHaritaLinki}
            onChange={(e) => setGoogleHaritaLinki(e.target.value)}
            required
            placeholder="https://maps.app.goo.gl/..."
            className={inputClass}
          />
        </label>
        <p className="mt-1 text-xs text-neutral-400">
          Google Maps&apos;te pazar yerini bul, &quot;Paylaş&quot; ile linki kopyala ve buraya
          yapıştır.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium text-neutral-700">
          Başlangıç Günü
          <select
            value={baslangicGunu}
            onChange={(e) => setBaslangicGunu(e.target.value)}
            className={inputClass}
          >
            {HAFTA_GUNLERI.map((g) => (
              <option key={g.deger} value={g.deger}>
                {g.etiket}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-neutral-700">
          Başlangıç Saati
          <input
            type="time"
            value={baslangicSaati}
            onChange={(e) => setBaslangicSaati(e.target.value)}
            required
            className={inputClass}
          />
        </label>
      </div>
      <p className="-mt-2 text-xs text-neutral-400">
        Başlangıç: pazarın açılış (no-show ceza eşiği) anı.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium text-neutral-700">
          Sıfırlama Günü
          <select
            value={sifirlamaGunu}
            onChange={(e) => setSifirlamaGunu(e.target.value)}
            className={inputClass}
          >
            {HAFTA_GUNLERI.map((g) => (
              <option key={g.deger} value={g.deger}>
                {g.etiket}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-neutral-700">
          Sıfırlama Saati
          <input
            type="time"
            value={sifirlamaSaati}
            onChange={(e) => setSifirlamaSaati(e.target.value)}
            required
            className={inputClass}
          />
        </label>
      </div>
      <p className="-mt-2 text-xs text-neutral-400">
        Sıfırlama: kuyruğun temizlendiği kapanış anı.
      </p>

      <div>
        <label className="block text-sm font-medium text-neutral-700">
          Saat Dilimi
          <input
            type="text"
            value={saatDilimi}
            onChange={(e) => setSaatDilimi(e.target.value)}
            placeholder="Europe/Istanbul"
            className={inputClass}
          />
        </label>
      </div>

      {duzenlemeModu && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
            <input
              type="checkbox"
              checked={aktifMi}
              onChange={(e) => setAktifMi(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300"
            />
            Aktif
          </label>
          <p className="mt-1 text-xs text-neutral-500">
            Pazar pasif yapıldığında: bağlı tezgahlar anasayfa/vitrinde görünmez, o pazardaki
            satıcılar panellerine giremez (&quot;bu pazar aktif değil&quot; uyarısı görürler).
            Hiçbir kayıt kalıcı silinmez — bir pazarı kaldırmak yerine (bağlı tezgahlar
            olduğu için silinemez) burada pasifleştirebilirsiniz.
          </p>
        </div>
      )}

      {hata && <p className="text-sm text-red-600">{hata}</p>}

      <button
        type="submit"
        disabled={gonderiliyor}
        className="w-full rounded-md bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
      >
        {gonderiliyor ? "Kaydediliyor…" : duzenlemeModu ? "Kaydet" : "Pazarı Oluştur"}
      </button>
    </form>
  );
}
