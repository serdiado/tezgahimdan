"use client";

import { useState } from "react";
import Link from "next/link";
import { DegerlendirmeFormu } from "@/components/DegerlendirmeFormu";
import { YildizGosterge } from "@/components/YildizGosterge";

type UrunDegerlendirmesi = {
  id: string;
  urunId: string;
  urunBaslik: string;
  magazaAd: string;
  magazaSlug: string;
  puan: number;
  yorum: string | null;
  tarih: string;
};

// DegerlendirmeFormu.tsx AYNEN yeniden kullanilir (props zaten jenerik) -
// "Duzenle" tiklaninca ayni modal acilir, onClose sonrasi router.refresh()
// zaten formun kendi icinde.
export function DegerlendirmelerimUrunlerIcerik({
  degerlendirmeler,
}: {
  degerlendirmeler: UrunDegerlendirmesi[];
}) {
  const [duzenlenenId, setDuzenlenenId] = useState<string | null>(null);

  if (degerlendirmeler.length === 0) {
    return (
      <p className="mt-4 text-neutral-600">
        Henüz bir ürün değerlendirmesi yapmadınız. Satın aldığınız ürünler için
        Rezervasyonlarım sayfasından değerlendirme bırakabilirsiniz.
      </p>
    );
  }

  const duzenlenen = degerlendirmeler.find((d) => d.urunId === duzenlenenId);

  return (
    <div className="mt-4 space-y-3">
      {degerlendirmeler.map((d) => (
        <div key={d.id} className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-neutral-900">{d.urunBaslik}</h3>
              <Link href={`/magaza/${d.magazaSlug}`} className="text-sm text-primary-600 hover:underline">
                {d.magazaAd}
              </Link>
            </div>
            <span className="shrink-0 text-xs text-neutral-400">{d.tarih}</span>
          </div>
          <YildizGosterge ortalama={d.puan} sayi={1} />
          {d.yorum && <p className="mt-1 text-sm text-neutral-600">{d.yorum}</p>}
          <button
            type="button"
            onClick={() => setDuzenlenenId(d.urunId)}
            className="mt-3 rounded-md border border-primary-300 px-3 py-1.5 text-sm font-semibold text-primary-700 hover:bg-primary-50"
          >
            Düzenle
          </button>
        </div>
      ))}

      {duzenlenen && (
        <DegerlendirmeFormu
          urunId={duzenlenen.urunId}
          urunBaslik={duzenlenen.urunBaslik}
          mevcutPuan={duzenlenen.puan}
          mevcutYorum={duzenlenen.yorum}
          onClose={() => setDuzenlenenId(null)}
        />
      )}
    </div>
  );
}
