"use client";

import { useMemo, useState } from "react";
import { kategoriIkonuSec, kategoriRengiSec } from "@/lib/kategori-renkleri";
import { UrunKarti, type UrunKartiVeri } from "./UrunKarti";

export function MagazaIcerik({
  urunler,
  girisli,
  kullaniciTelefonVar,
  magazaSlug,
}: {
  urunler: UrunKartiVeri[];
  girisli: boolean;
  kullaniciTelefonVar: boolean;
  magazaSlug: string;
}) {
  const [secilenKategoriId, setSecilenKategoriId] = useState<string | null>(null);

  // Chip satiri icin, bu magazadaki urunlerde gercekten var olan kategorileri
  // (id'ye gore tekillestirilmis) cikariyoruz - olmayan/bos kategori chip'i yok.
  const kategoriler = useMemo(() => {
    const gorulen = new Map<string, { id: string; ad: string; sira: number }>();
    for (const urun of urunler) {
      if (!gorulen.has(urun.kategori.id)) gorulen.set(urun.kategori.id, urun.kategori);
    }
    // Bilincli kategori sirasina gore (bkz. Kategori.sira); esitlikte ad'a gore.
    return Array.from(gorulen.values()).sort((a, b) => a.sira - b.sira || a.ad.localeCompare(b.ad, "tr"));
  }, [urunler]);

  const gorunenUrunler = secilenKategoriId
    ? urunler.filter((u) => u.kategori.id === secilenKategoriId)
    : urunler;

  // Satilmis urunler (gecmis satislarin gorunur kalmasi karari, bkz.
  // docs/mimari/magaza-iletisim-ve-degerlendirme.md) sergide/doldu urunlerle
  // AYNI izgarada karismasin diye ayri bir blokta, sonda gosterilir.
  const aktifUrunler = gorunenUrunler.filter((u) => u.durum !== "satildi");
  const satilanUrunler = gorunenUrunler.filter((u) => u.durum === "satildi");

  if (urunler.length === 0) {
    return <p className="text-neutral-500">Bu tezgahta şu an sergide ürün yok.</p>;
  }

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

      {gorunenUrunler.length === 0 ? (
        <p className="text-neutral-500">Bu kategoride sergide ürün yok.</p>
      ) : (
        <>
          {aktifUrunler.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
              {aktifUrunler.map((urun) => (
                <UrunKarti
                  key={urun.id}
                  urun={urun}
                  girisli={girisli}
                  kullaniciTelefonVar={kullaniciTelefonVar}
                  magazaSlug={magazaSlug}
                />
              ))}
            </div>
          )}

          {satilanUrunler.length > 0 && (
            <div className={aktifUrunler.length > 0 ? "mt-10" : ""}>
              <h2 className="mb-4 text-base font-semibold text-neutral-700">Daha Önce Satılanlar</h2>
              <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
                {satilanUrunler.map((urun) => (
                  <UrunKarti
                    key={urun.id}
                    urun={urun}
                    girisli={girisli}
                    kullaniciTelefonVar={kullaniciTelefonVar}
                    magazaSlug={magazaSlug}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
