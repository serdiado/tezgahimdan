import Link from "next/link";
import { MapPin, Store } from "lucide-react";
import { gunEtiketi } from "@/lib/gun-etiketi";
import type { MockPazar } from "./mock-veri";

// /pazar/[slug]'in GERCEK hero'suyla AYNI gorsel dil (kapak fotografi + gradyan
// overlay) - yeni bir kart dili icat etmek yerine, N>=2 dunyada bu kartlarin
// GERCEKTEN boyle gorunecegini gostermek. Yeni renk/desen YOK (gorsel sadelik
// kurali) - sadece primary paleti.
//
// gercekMi=false olan kartlar BILEREK inert: <div>, hover yok, kucuk "Örnek"
// rozeti. Tek link veren kart Seferihisar - o GERCEKTEN calisan bir sayfaya
// gidiyor, tikladiginda ne hissettirecegini dogru gosteriyor. Mock pazarlarin
// linki olsaydi 404'e ya da yalanci bir hisse goturur, prototipin durustlugunu
// bozardi.
export function PazarKarti({ pazar, bugunMu }: { pazar: MockPazar; bugunMu: boolean }) {
  const icerik = (
    <div className="relative h-44 overflow-hidden rounded-2xl shadow-sm transition-transform group-hover:scale-[1.01]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={pazar.kapakFotoUrl} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-linear-to-t from-primary-900/85 via-primary-900/20 to-transparent" />

      {!pazar.gercekMi && (
        <span className="absolute top-3 right-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-neutral-600">
          Örnek
        </span>
      )}
      {bugunMu && (
        <span className="absolute top-3 left-3 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-primary-700">
          Bugün kuruluyor
        </span>
      )}

      <div className="absolute inset-x-0 bottom-0 p-4 text-white">
        <p className="text-base font-bold">{pazar.ad}</p>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-white/85">
          <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          <span>
            {pazar.ilce}, {pazar.il}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-white/85">
          <span>her {gunEtiketi(pazar.baslangicGunu)}</span>
          <span className="flex items-center gap-1">
            <Store className="h-3.5 w-3.5" strokeWidth={2} />
            {pazar.tezgahSayisi} tezgah
          </span>
        </div>
      </div>
    </div>
  );

  if (pazar.gercekMi) {
    return (
      <Link href={`/pazar/${pazar.slug}`} className="group block">
        {icerik}
      </Link>
    );
  }
  return <div className="group cursor-default">{icerik}</div>;
}
