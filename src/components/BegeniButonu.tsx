"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Heart } from "lucide-react";

// Kalp/begeni: begeni sayisi HERKESE ACIK gosterilir (kullanici karari) - bu
// yuzden girissiz ziyaretci de bu bileseni gorur, sadece TIKLAYINCA giris
// istenir (rezerveTikla/sikayetTikla ile ayni desen: /giris?next=...).
export function BegeniButonu({
  urunId,
  girisli,
  begeniSayisi,
  benimBegenimVar,
  kompakt = false,
  gorselUzerinde = false,
}: {
  urunId: string;
  girisli: boolean;
  begeniSayisi: number;
  benimBegenimVar: boolean;
  // kompakt: sayi olmadan sadece ikon (TakipButonu'ndaki ayni desen).
  kompakt?: boolean;
  // gorselUzerinde: mobil kompakt kartta fotografin sag-ust kosesine
  // bindirilen versiyon - koyu yari-saydam arka plan + varsayilan beyaz ikon
  // (normal beyaz-zeminli text-neutral-500 burada okunmaz).
  gorselUzerinde?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [begenildi, setBegenildi] = useState(benimBegenimVar);
  const [sayi, setSayi] = useState(begeniSayisi);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  async function tikla() {
    if (!girisli) {
      const next = `${pathname}?urun=${urunId}`;
      router.push(`/giris?next=${encodeURIComponent(next)}`);
      return;
    }
    if (gonderiliyor) return;

    // Optimistic UI - basarisiz olursa asagida geri alinir.
    const oncekiBegenildi = begenildi;
    const oncekiSayi = sayi;
    setBegenildi(!begenildi);
    setSayi(begenildi ? sayi - 1 : sayi + 1);
    setGonderiliyor(true);
    try {
      const res = await fetch("/api/favori", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urunId, tur: "begeni" }),
      });
      if (!res.ok) throw new Error("basarisiz");
      const data = await res.json();
      // Sunucudaki gercek degerle senkronla (coklu-tiklama/yaris durumunda
      // istemci state'i tutarli kalsin).
      setBegenildi(data.begeniMi);
      setSayi(data.begeniSayisi);
      // Sunucu bilesenlerini tazele (RezerveModal ile ayni desen): ayni urun
      // baska bir yerde (ör. detay modali) HENUZ acilmadiysa, acildiginda
      // guncel begeniSayisi'ni gorsun - aksi halde eski prop'la mount olurdu.
      router.refresh();
    } catch {
      setBegenildi(oncekiBegenildi);
      setSayi(oncekiSayi);
    } finally {
      setGonderiliyor(false);
    }
  }

  if (kompakt) {
    return (
      <button
        type="button"
        onClick={tikla}
        disabled={gonderiliyor}
        aria-label={begenildi ? "Beğenmekten vazgeç" : "Beğen"}
        className={`flex items-center justify-center disabled:opacity-60 ${
          gorselUzerinde ? "h-7 w-7 rounded-full bg-black/40 text-white hover:bg-black/60" : ""
        }`}
      >
        <Heart className={`h-5 w-5 ${begenildi ? "fill-red-500 text-red-500" : ""}`} strokeWidth={2} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={tikla}
      disabled={gonderiliyor}
      className="flex w-fit items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-red-600 disabled:opacity-60"
    >
      <Heart className={`h-5 w-5 ${begenildi ? "fill-red-500 text-red-500" : ""}`} strokeWidth={2} />
      {sayi}
    </button>
  );
}
