import Link from "next/link";
import { Store } from "lucide-react";

export type MagazaKartiVeri = {
  id: string;
  ad: string;
  slug: string;
  aciklama: string | null;
  pazarAd: string;
  urunSayisi: number;
};

export function MagazaKarti({ magaza }: { magaza: MagazaKartiVeri }) {
  return (
    <Link
      href={`/magaza/${magaza.slug}`}
      className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm transition-shadow duration-200 hover:shadow-md"
    >
      <div className="flex items-center gap-2">
        <Store className="h-5 w-5 text-primary-600" strokeWidth={1.75} />
        <h3 className="font-semibold text-neutral-900">{magaza.ad}</h3>
      </div>
      {magaza.aciklama && (
        <p className="line-clamp-2 text-sm text-neutral-600">{magaza.aciklama}</p>
      )}
      <p className="mt-auto text-xs text-neutral-400">
        {magaza.pazarAd} · {magaza.urunSayisi} ürün
      </p>
    </Link>
  );
}
