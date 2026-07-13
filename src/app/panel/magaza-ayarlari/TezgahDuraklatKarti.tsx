"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PauseCircle, PlayCircle } from "lucide-react";

// SELF-SERVIS tezgah duraklatma karti (2026-07-11). Ayarlar FORMUNUN DISINDA
// ayri bir kart - form "Kaydet"e bagli calisir, bu ise aninda etkili tekil bir
// eylem. Onay window.confirm ile DEGIL satir-ici iki-adimli buton ile (proje
// deneyimi: window.confirm bazi ortamlarda sorunlu + mobilde kaba durur).
export function TezgahDuraklatKarti({ duraklatildiMi }: { duraklatildiMi: boolean }) {
  const router = useRouter();
  const [onayModu, setOnayModu] = useState(false);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  async function gonder(duraklat: boolean) {
    setHata(null);
    setGonderiliyor(true);
    const res = await fetch("/api/panel/magaza-duraklat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ duraklat }),
    });
    setGonderiliyor(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setHata(data.hata ?? "işlem tamamlanamadı");
      return;
    }
    setOnayModu(false);
    router.refresh();
  }

  if (duraklatildiMi) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-800">Tezgahın şu an duraklatılmış</p>
        <p className="mt-1 text-sm text-amber-800">
          Tezgahın ve ürünlerin vitrinde görünmüyor, yeni rezervasyon alınmıyor. Pazara
          döneceğin zaman devam ettirebilirsin.
        </p>
        {hata && <p className="mt-2 text-sm text-red-600">{hata}</p>}
        <button
          type="button"
          onClick={() => gonder(false)}
          disabled={gonderiliyor}
          className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
        >
          <PlayCircle className="h-4 w-4" strokeWidth={2} />
          {gonderiliyor ? "Açılıyor…" : "Tezgahı Devam Ettir"}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <p className="text-sm font-semibold text-neutral-800">Tezgahı Duraklat</p>
      <p className="mt-1 text-sm text-neutral-600">
        Pazara ara vermen gerekiyorsa (hastalık, tatil…) tezgahını duraklatabilirsin:
        tezgahın vitrinden gizlenir, yeni rezervasyon alınmaz ve{" "}
        <span className="font-semibold">bekleyen rezervasyonların iptal edilip alıcılara
        haber verilir</span>. İstediğin zaman devam ettirebilirsin.
      </p>
      {hata && <p className="mt-2 text-sm text-red-600">{hata}</p>}
      {onayModu ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => gonder(true)}
            disabled={gonderiliyor}
            className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            <PauseCircle className="h-4 w-4" strokeWidth={2} />
            {gonderiliyor ? "Duraklatılıyor…" : "Evet, Duraklat"}
          </button>
          <button
            type="button"
            onClick={() => setOnayModu(false)}
            disabled={gonderiliyor}
            className="rounded-md px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
          >
            Vazgeç
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOnayModu(true)}
          className="mt-3 inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold text-red-600 ring-1 ring-inset ring-red-200 hover:bg-red-50"
        >
          <PauseCircle className="h-4 w-4" strokeWidth={2} />
          Tezgahı Duraklat
        </button>
      )}
    </div>
  );
}
