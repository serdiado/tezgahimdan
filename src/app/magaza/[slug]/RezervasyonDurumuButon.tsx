"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { siraMesaji } from "@/lib/rezervasyon-metin";

// UrunKarti (kart) ve UrunDetayModal (detay) AYNI bilesenle "Rezerve Et"
// yerine kullanicinin kendi sira durumunu gosterir - tiklaninca vazgecebilir
// (2026-07-07 istegi: gosterge artik salt-okunur degil). window.confirm
// kullanilir (useDegisiklikUyarisi ile ayni proje-ici desen) - RezervasyonumIcerik.tsx'teki
// ozel iki-adimli onay yerine, cunku bu buton dar mobil kart genisliginde de
// (2 sutun) calismali; native dialog genislik sinirini tamamen ortadan kaldirir.
export function RezervasyonDurumuButon({
  rezervasyon,
}: {
  rezervasyon: { id: string; tip: "aktif" | "yedek"; siraNo: number };
}) {
  const router = useRouter();
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  async function tikla() {
    if (yukleniyor) return;
    if (!window.confirm("Sıranız kaybolur ve geri alınamaz. Rezervasyondan vazgeçmek istiyor musunuz?")) {
      return;
    }
    setYukleniyor(true);
    setHata(null);
    const res = await fetch("/api/rezervasyon/vazgec", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rezervId: rezervasyon.id }),
    });
    setYukleniyor(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setHata(data.hata ?? "vazgeçilemedi");
      return;
    }
    // Sunucu bilesenleri tazelenir - bu urundeki benimRezervasyonum null olur,
    // buton dogal olarak "Rezerve Et"e doner (UrunKarti/UrunDetayModal'daki
    // kosullu render, bkz. o dosyalar).
    router.refresh();
  }

  return (
    <div className="flex-1">
      <button
        type="button"
        onClick={tikla}
        disabled={yukleniyor}
        className="w-full rounded-md bg-primary-50 px-3 py-1 text-center text-sm font-semibold text-primary-700 ring-1 ring-inset ring-primary-200 transition-colors hover:bg-red-50 hover:text-red-700 hover:ring-red-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {yukleniyor ? "Vazgeçiliyor…" : siraMesaji(rezervasyon.tip, rezervasyon.siraNo)}
      </button>
      {hata && <p className="mt-1 text-center text-xs text-red-600">{hata}</p>}
    </div>
  );
}
