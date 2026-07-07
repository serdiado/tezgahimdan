"use client";

import { useState } from "react";
import Image from "next/image";
import { GorselBuyutmeModal } from "@/components/GorselBuyutmeModal";

// MagazaHero.tsx server component oldugu icin (SiteHeader/mağaza sayfasi ile
// ayni), tiklama+modal state'i kucuk bir client bilesene ayrildi - MagazaTakipButonu/
// MagazaSikayetButonu ile ayni "kucuk client ada" deseni.
export function KrokiGorseli({ krokiFotoUrl }: { krokiFotoUrl: string }) {
  const [acik, setAcik] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAcik(true)}
        aria-label="Tezgah/kroki fotoğrafını büyüt"
        className="relative h-14 w-14 overflow-hidden rounded-lg border-2 border-white/30"
      >
        <Image src={krokiFotoUrl} alt="Tezgah/kroki fotoğrafı" fill className="object-cover" sizes="56px" />
      </button>
      {acik && (
        <GorselBuyutmeModal
          foto={krokiFotoUrl}
          alt="Tezgah/kroki fotoğrafı"
          onClose={() => setAcik(false)}
        />
      )}
    </>
  );
}
