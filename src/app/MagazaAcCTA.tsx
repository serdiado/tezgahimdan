import Link from "next/link";
import { Store } from "lucide-react";

// Hedef her zaman statik oldugu icin (UrunKarti/MagazaSikayetButonu'nun aksine
// dinamik bir id'ye bagli degil) client bilesen/onClick gerekmiyor - sunucu
// girisli durumunu zaten biliyor, dogru href'i dogrudan render eder.
export function MagazaAcCTA({ girisli }: { girisli: boolean }) {
  const href = girisli ? "/panel/magaza-ac" : "/giris?next=%2Fpanel%2Fmagaza-ac";
  return (
    <div className="mt-10 flex flex-col items-start gap-3 rounded-2xl bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="font-semibold text-neutral-900">Sen de tezgahını açabilirsin</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Birkaç adımda mağazanı kur, ürünlerini sergilemeye başla.
        </p>
      </div>
      <Link
        href={href}
        className="flex shrink-0 items-center gap-1.5 rounded-md bg-primary-600 px-4 py-2 font-semibold text-white hover:bg-primary-700"
      >
        <Store className="h-4 w-4" strokeWidth={2} />
        Mağaza Aç
      </Link>
    </div>
  );
}
