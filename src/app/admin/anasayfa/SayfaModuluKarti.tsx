"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronUp, ChevronDown } from "lucide-react";

export type SayfaModuluVeri = {
  tur: "haftalik_ritim" | "yeni_urunler" | "en_cok_begenilen" | "magaza_listesi";
  baslik: string;
  aktifMi: boolean;
  ilkMi: boolean;
  sonMi: boolean;
  // Sadece urun/magaza izgarasi olan modullerde dolu - haftalik_ritim'de undefined.
  ayarlar?: { kolonSayisi: 3 | 4; sunumTipi?: "grid" | "slider"; ogeSayisi?: number };
  sunumSecenegiVar: boolean;
};

export function SayfaModuluKarti({ modul }: { modul: SayfaModuluVeri }) {
  const router = useRouter();
  const [bekliyor, setBekliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [kolonSayisi, setKolonSayisi] = useState(modul.ayarlar?.kolonSayisi ?? 3);
  const [sunumTipi, setSunumTipi] = useState(modul.ayarlar?.sunumTipi ?? "grid");
  const [ogeSayisi, setOgeSayisi] = useState(modul.ayarlar?.ogeSayisi ?? 12);

  async function guncelle(body: object) {
    setHata(null);
    setBekliyor(true);
    const res = await fetch("/api/admin/sayfa-modulu-guncelle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tur: modul.tur, ...body }),
    });
    setBekliyor(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setHata(data.hata ?? "işlem başarısız");
      return;
    }
    router.refresh();
  }

  async function sirala(yon: "yukari" | "asagi") {
    setHata(null);
    setBekliyor(true);
    const res = await fetch("/api/admin/sayfa-modulu-sirala", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tur: modul.tur, yon }),
    });
    setBekliyor(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setHata(data.hata ?? "sıralanamadı");
      return;
    }
    router.refresh();
  }

  return (
    <div className={`rounded-2xl bg-white p-4 shadow-sm ${!modul.aktifMi ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <button
              type="button"
              onClick={() => sirala("yukari")}
              disabled={bekliyor || modul.ilkMi}
              className="text-neutral-400 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Yukarı taşı"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => sirala("asagi")}
              disabled={bekliyor || modul.sonMi}
              className="text-neutral-400 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Aşağı taşı"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
          <span className="font-semibold text-neutral-900">{modul.baslik}</span>
        </div>

        <label className="flex items-center gap-2 text-sm text-neutral-600">
          <input
            type="checkbox"
            checked={modul.aktifMi}
            disabled={bekliyor}
            onChange={(e) => guncelle({ aktifMi: e.target.checked })}
            className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
          />
          Anasayfada göster
        </label>
      </div>

      {modul.ayarlar && (
        <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-neutral-100 pt-3 text-sm">
          <label className="text-neutral-700">
            Kolon
            <select
              value={kolonSayisi}
              disabled={bekliyor}
              onChange={(e) => {
                const v = Number(e.target.value) as 3 | 4;
                setKolonSayisi(v);
                guncelle({ ayarlar: { kolonSayisi: v } });
              }}
              className="ml-1 rounded-md border border-neutral-300 px-2 py-1 text-sm"
            >
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
          </label>

          {modul.sunumSecenegiVar && (
            <label className="text-neutral-700">
              Sunum
              <select
                value={sunumTipi}
                disabled={bekliyor}
                onChange={(e) => {
                  const v = e.target.value as "grid" | "slider";
                  setSunumTipi(v);
                  guncelle({ ayarlar: { sunumTipi: v } });
                }}
                className="ml-1 rounded-md border border-neutral-300 px-2 py-1 text-sm"
              >
                <option value="grid">Izgara</option>
                <option value="slider">Kaydırmalı (slider)</option>
              </select>
            </label>
          )}

          {modul.ayarlar.ogeSayisi !== undefined && (
            <label className="text-neutral-700">
              Öğe sayısı
              <input
                type="number"
                min={4}
                max={24}
                step={1}
                value={ogeSayisi}
                disabled={bekliyor}
                onChange={(e) => setOgeSayisi(Number(e.target.value))}
                onBlur={() => guncelle({ ayarlar: { ogeSayisi } })}
                className="ml-1 w-16 rounded-md border border-neutral-300 px-2 py-1 text-sm"
              />
            </label>
          )}
        </div>
      )}

      {hata && <p className="mt-2 text-xs text-red-600">{hata}</p>}
    </div>
  );
}
