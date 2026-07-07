"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, BellRing } from "lucide-react";

// Favori/takip: bildirim aboneligi. begeniden ayri, bildirimGonderTakipcilere
// (src/lib/bildirim.ts) bu bayragi okur - yedek-tier haric her aktif-katman
// hareketinde bildirim uretir (bkz. plan dosyasi). BegeniButonu ile ayni
// optimistic-toggle + login-gate + router.refresh() deseni - hem kartta
// (kompakt=true, ikon-only) hem detay modalinda (kompakt=false, ikon+etiket
// pill) kullanilir, kod tekrari yerine tek bilesen.
export function TakipButonu({
  urunId,
  girisli,
  benimTakibimVar,
  kompakt = false,
  gorselUzerinde = false,
}: {
  urunId: string;
  girisli: boolean;
  benimTakibimVar: boolean;
  kompakt?: boolean;
  // gorselUzerinde: BegeniButonu'ndaki ayni desen - mobil kompakt kartta
  // fotografin uzerine bindirilen versiyon.
  gorselUzerinde?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [takipEdiliyor, setTakipEdiliyor] = useState(benimTakibimVar);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  async function tikla() {
    if (!girisli) {
      const next = `${pathname}?urun=${urunId}`;
      router.push(`/giris?next=${encodeURIComponent(next)}`);
      return;
    }
    if (gonderiliyor) return;
    const onceki = takipEdiliyor;
    setTakipEdiliyor(!onceki);
    setGonderiliyor(true);
    try {
      const res = await fetch("/api/favori", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urunId, tur: "takip" }),
      });
      if (!res.ok) throw new Error("basarisiz");
      const data = await res.json();
      setTakipEdiliyor(data.takipMi);
      router.refresh();
    } catch {
      setTakipEdiliyor(onceki);
    } finally {
      setGonderiliyor(false);
    }
  }

  if (kompakt) {
    const renk = gorselUzerinde
      ? takipEdiliyor
        ? "text-primary-400"
        : "text-white"
      : takipEdiliyor
        ? "text-primary-600"
        : "text-neutral-500 hover:text-primary-600";
    const cerceve = gorselUzerinde ? "h-7 w-7 rounded-full bg-black/40 hover:bg-black/60" : "";
    return (
      <button
        type="button"
        onClick={tikla}
        disabled={gonderiliyor}
        aria-label={takipEdiliyor ? "Takibi bırak" : "Takip Et"}
        className={`flex items-center justify-center disabled:opacity-60 ${cerceve} ${renk}`}
      >
        {takipEdiliyor ? (
          <BellRing className="h-5 w-5" strokeWidth={2} />
        ) : (
          <Bell className="h-5 w-5" strokeWidth={2} />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={tikla}
      disabled={gonderiliyor}
      className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold disabled:opacity-60 ${
        takipEdiliyor
          ? "border-primary-200 bg-primary-50 text-primary-700"
          : "border-neutral-300 text-neutral-700 hover:bg-neutral-100"
      }`}
    >
      {takipEdiliyor ? (
        <>
          <BellRing className="h-3.5 w-3.5" strokeWidth={2} />
          Takip Ediliyor
        </>
      ) : (
        <>
          <Bell className="h-3.5 w-3.5" strokeWidth={2} />
          Takip Et
        </>
      )}
    </button>
  );
}
