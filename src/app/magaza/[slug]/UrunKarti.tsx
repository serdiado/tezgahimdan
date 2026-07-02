import Image from "next/image";
import { kategoriIkonuSec, kategoriRengiSec } from "@/lib/kategori-renkleri";

const DURUM_STIL: Record<string, { etiket: string; className: string }> = {
  sergide: { etiket: "Sergide", className: "bg-green-100 text-green-700" },
  doldu: { etiket: "Dolu", className: "bg-amber-100 text-amber-700" },
  satildi: { etiket: "Satıldı", className: "bg-neutral-200 text-neutral-600" },
};

const fiyatFormat = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
});

export type UrunKartiVeri = {
  id: string;
  baslik: string;
  fiyat: number;
  durum: string;
  fotograflar: string[];
  kategori: { id: string; ad: string };
};

export function UrunKarti({ urun }: { urun: UrunKartiVeri }) {
  const renk = kategoriRengiSec(urun.kategori.id);
  const Ikon = kategoriIkonuSec(urun.kategori.ad);
  const fotograf = urun.fotograflar[0];
  const durumStil = DURUM_STIL[urun.durum] ?? { etiket: urun.durum, className: "bg-neutral-200 text-neutral-600" };

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow duration-200 hover:shadow-md">
      <div className={`relative aspect-square w-full ${fotograf ? "bg-neutral-100" : renk.bg}`}>
        {fotograf ? (
          <Image src={fotograf} alt={urun.baslik} fill className="object-cover" sizes="(max-width: 640px) 100vw, 33vw" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Ikon className={`h-10 w-10 ${renk.text}`} strokeWidth={1.5} />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <span
          className={`w-fit rounded-full border px-3 py-1 text-sm font-semibold ${renk.bg} ${renk.text} ${renk.border}`}
        >
          {urun.kategori.ad}
        </span>
        <h3 className="font-medium text-neutral-900">{urun.baslik}</h3>
        <p className="text-lg font-semibold text-primary-700">{fiyatFormat.format(urun.fiyat)}</p>
        <span className={`mb-2 w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold ${durumStil.className}`}>
          {durumStil.etiket}
        </span>
        <button
          type="button"
          className="mt-auto w-full rounded-md bg-primary-500 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
        >
          Rezerve Et
        </button>
      </div>
    </div>
  );
}
