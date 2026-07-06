"use client";

import { useMemo, useState } from "react";
import { kategoriIkonuSec, kategoriRengiSec } from "@/lib/kategori-renkleri";
import { UrunKarti, type UrunKartiVeri } from "./magaza/[slug]/UrunKarti";

export type YeniUrunVeri = UrunKartiVeri & { magaza: { ad: string; slug: string } };

export function YeniEklenenler({
  urunler,
  girisli,
  kullaniciTelefonVar,
}: {
  urunler: YeniUrunVeri[];
  girisli: boolean;
  kullaniciTelefonVar: boolean;
}) {
  const [secilenKategoriId, setSecilenKategoriId] = useState<string | null>(null);

  // MagazaIcerik'teki chip-filtre deseninin ayni mantigi (bkz. o dosya) - burada
  // magazalar-arasi oldugu icin ayri, kucuk bir kopya olarak tutuluyor.
  const kategoriler = useMemo(() => {
    const gorulen = new Map<string, { id: string; ad: string }>();
    for (const urun of urunler) {
      if (!gorulen.has(urun.kategori.id)) gorulen.set(urun.kategori.id, urun.kategori);
    }
    return Array.from(gorulen.values());
  }, [urunler]);

  const gorunenUrunler = secilenKategoriId
    ? urunler.filter((u) => u.kategori.id === secilenKategoriId)
    : urunler;

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSecilenKategoriId(null)}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
            secilenKategoriId === null
              ? "bg-primary-600 text-white"
              : "bg-white text-neutral-600 ring-1 ring-inset ring-neutral-200 hover:bg-neutral-100"
          }`}
        >
          Tümü
        </button>
        {kategoriler.map((kategori) => {
          const renk = kategoriRengiSec(kategori.id);
          const Ikon = kategoriIkonuSec(kategori.ad);
          const secili = secilenKategoriId === kategori.id;
          return (
            <button
              key={kategori.id}
              type="button"
              onClick={() => setSecilenKategoriId(kategori.id)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                secili ? `${renk.bg} ${renk.text} ring-1 ring-inset ${renk.border}` : "bg-white text-neutral-600 ring-1 ring-inset ring-neutral-200 hover:bg-neutral-100"
              }`}
            >
              <Ikon className="h-4 w-4" strokeWidth={2} />
              {kategori.ad}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {gorunenUrunler.map((urun) => (
          <UrunKarti
            key={urun.id}
            urun={urun}
            magaza={urun.magaza}
            magazaSlug={urun.magaza.slug}
            girisli={girisli}
            kullaniciTelefonVar={kullaniciTelefonVar}
          />
        ))}
      </div>
    </div>
  );
}
