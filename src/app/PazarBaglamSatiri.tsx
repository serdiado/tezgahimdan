import Link from "next/link";
import { MapPin } from "lucide-react";
import { gunEtiketi } from "@/lib/gun-etiketi";

// Ana sayfanin urun katmaninin ustundeki BAGLAM SATIRI (2026-07-15).
//
// Ne diyor: "asagida gordugun her sey BU pazardan, BU gun alinabilir."
// Neden gerekli: ana sayfa bugun fiilen Seferihisar sayfasi (olculdu: tek pazar
// var, ana sayfadaki tum urunler oradan) - ama bunu HIC SOYLEMIYOR. Her urun
// karti "bu carsamba su tezgahtan al" vaat ediyor; o vaadin kapsami gorunmez.
//
// EN ONEMLI OZELLIK - kendiliginden kaybolur:
// Yalnizca TEK aktif pazar varken render edilir. Ikinci pazar acildigi an bu
// satir yok olur, cunku "hepsi bu pazardan" cumlesi o an YALAN olur. Yani
// bilesen sessizce yanlisa donusmek yerine sessizce cekilir (fail-safe) ve
// eksikligi "artik kapsam SECICISI lazim" sinyalidir - bkz. ana sayfa kapsam
// ekseni karari: kapsam bir FILTRE'dir, route degil; ve cogul olacaktir.
// Yerine gelecek bilesen bunun buyumus halidir ("Pazar: Seferihisar ▾").
export function PazarBaglamSatiri({
  pazar,
}: {
  pazar: { ad: string; slug: string; il: string; ilce: string; baslangicGunu: string };
}) {
  return (
    <div className="mt-8 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      <MapPin className="h-4 w-4 shrink-0 text-primary-600" strokeWidth={2} />
      <span className="font-semibold text-neutral-900">{pazar.ad}</span>
      <span className="text-neutral-400">·</span>
      <span className="text-neutral-600">her {gunEtiketi(pazar.baslangicGunu)}</span>
      <span className="text-neutral-400">·</span>
      <span className="text-neutral-600">
        {pazar.ilce}, {pazar.il}
      </span>
      <span className="text-neutral-400">·</span>
      <Link
        href={`/pazar/${pazar.slug}`}
        className="font-medium text-primary-600 hover:underline"
      >
        Pazar sayfası
      </Link>
    </div>
  );
}
