"use client";

import { useState } from "react";
import Link from "next/link";
import { MagazaDegerlendirmeFormu } from "@/components/MagazaDegerlendirmeFormu";
import { YildizGosterge } from "@/components/YildizGosterge";

type MagazaDegerlendirmesi = {
  id: string;
  magazaId: string;
  magazaAd: string;
  magazaSlug: string;
  puan: number;
  yorum: string | null;
  tarih: string;
};

// DegerlendirmelerimUrunlerIcerik.tsx ile ayni desen - MagazaDegerlendirmeFormu
// AYNEN yeniden kullanilir. Kendine ait "Magazayi Degerlendir" (satin alinan
// ama HENUZ degerlendirilmemis magazalar icin) bu sayfada YOK -
// /rezervasyonum'daki rezervasyon-bazli akistan baslatiliyor (bkz. plan bolum 4).
export function DegerlendirmelerimMagazalarIcerik({
  degerlendirmeler,
}: {
  degerlendirmeler: MagazaDegerlendirmesi[];
}) {
  const [duzenlenenId, setDuzenlenenId] = useState<string | null>(null);

  if (degerlendirmeler.length === 0) {
    return (
      <p className="mt-4 text-neutral-600">
        Henüz bir mağaza değerlendirmesi yapmadınız. Satın aldığınız bir mağaza
        için Rezervasyonlarım sayfasından değerlendirme bırakabilirsiniz.
      </p>
    );
  }

  const duzenlenen = degerlendirmeler.find((d) => d.magazaId === duzenlenenId);

  return (
    <div className="mt-4 space-y-3">
      {degerlendirmeler.map((d) => (
        <div key={d.id} className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/magaza/${d.magazaSlug}`} className="font-semibold text-neutral-900 hover:underline">
              {d.magazaAd}
            </Link>
            <span className="shrink-0 text-xs text-neutral-400">{d.tarih}</span>
          </div>
          <YildizGosterge ortalama={d.puan} sayi={1} />
          {d.yorum && <p className="mt-1 text-sm text-neutral-600">{d.yorum}</p>}
          <button
            type="button"
            onClick={() => setDuzenlenenId(d.magazaId)}
            className="mt-3 rounded-md border border-primary-300 px-3 py-1.5 text-sm font-semibold text-primary-700 hover:bg-primary-50"
          >
            Düzenle
          </button>
        </div>
      ))}

      {duzenlenen && (
        <MagazaDegerlendirmeFormu
          magazaId={duzenlenen.magazaId}
          magazaAd={duzenlenen.magazaAd}
          mevcutPuan={duzenlenen.puan}
          mevcutYorum={duzenlenen.yorum}
          onClose={() => setDuzenlenenId(null)}
        />
      )}
    </div>
  );
}
