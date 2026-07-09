"use client";

import { useState } from "react";
import Link from "next/link";
import { YildizGosterge } from "@/components/YildizGosterge";

type MagazaYorumu = { id: string; kullaniciAd: string; puan: number; yorum: string; tarih: string };
type UrunYorumu = MagazaYorumu & { urunId: string; urunBaslik: string };

// MagazaIcerik.tsx'teki kategori-chip deseniyle AYNI pill-sekme gorseli
// (secili: dolu primary, secili-degil: beyaz+ring) - yeni bir tasarim dili
// eklemek yerine projede zaten var olan sekme/chip diliyle tutarli.
export function YorumlarSekmeleri({
  magazaSlug,
  magazaYorumlari,
  urunYorumlari,
  baslangicSekmesi = "magaza",
}: {
  magazaSlug: string;
  magazaYorumlari: MagazaYorumu[];
  urunYorumlari: UrunYorumu[];
  baslangicSekmesi?: "magaza" | "urun";
}) {
  const [sekme, setSekme] = useState<"magaza" | "urun">(baslangicSekmesi);

  return (
    <div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setSekme("magaza")}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
            sekme === "magaza"
              ? "bg-primary-600 text-white"
              : "bg-white text-neutral-600 ring-1 ring-inset ring-neutral-200 hover:bg-neutral-100"
          }`}
        >
          Tezgah Yorumları ({magazaYorumlari.length})
        </button>
        <button
          type="button"
          onClick={() => setSekme("urun")}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
            sekme === "urun"
              ? "bg-primary-600 text-white"
              : "bg-white text-neutral-600 ring-1 ring-inset ring-neutral-200 hover:bg-neutral-100"
          }`}
        >
          Ürün Yorumları ({urunYorumlari.length})
        </button>
      </div>

      {sekme === "magaza" && (
        <div className="mt-4 space-y-3">
          {magazaYorumlari.length === 0 ? (
            <p className="text-neutral-500">Bu tezgah için henüz yorum yok.</p>
          ) : (
            magazaYorumlari.map((y) => (
              <div key={y.id} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-neutral-800">{y.kullaniciAd}</span>
                  <span className="text-xs text-neutral-400">{y.tarih}</span>
                </div>
                <YildizGosterge ortalama={y.puan} sayi={1} />
                <p className="mt-1 text-sm text-neutral-600">{y.yorum}</p>
              </div>
            ))
          )}
        </div>
      )}

      {sekme === "urun" && (
        <div className="mt-4 space-y-3">
          {urunYorumlari.length === 0 ? (
            <p className="text-neutral-500">Bu tezgahın ürünleri için henüz yorum yok.</p>
          ) : (
            urunYorumlari.map((y) => (
              <div key={y.id} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-neutral-800">{y.kullaniciAd}</span>
                  <span className="text-xs text-neutral-400">{y.tarih}</span>
                </div>
                <Link
                  href={`/magaza/${magazaSlug}?urun=${y.urunId}`}
                  className="mt-0.5 block w-fit text-xs font-medium text-primary-600 hover:underline"
                >
                  {y.urunBaslik}
                </Link>
                <YildizGosterge ortalama={y.puan} sayi={1} />
                <p className="mt-1 text-sm text-neutral-600">{y.yorum}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
