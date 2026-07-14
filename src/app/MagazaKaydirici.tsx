"use client";

import { useCallback, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MagazaKarti, type MagazaKartiVeri } from "@/components/MagazaKarti";

const OTOMATIK_ILERLEME_MS = 3000;

// Kullanici karari (2026-07-14): MagazaVitrini'nin "slider" modu YeniEklenenler'
// deki pasif kaydirma seridi DEGIL - gercek bir CAROUSEL: sag/sol ok + 3sn'de
// bir otomatik ilerleme + mobilde hala parmakla surukleme. Bu yuzden ayri bir
// "use client" bilesen: alttaki scroll konteyner NATIVE kalir (dokunmatik
// surukleme bedava gelir, JS gerekmez), ok/otomatik-ilerleme AYNI konteynerin
// scrollBy'ini tetikler - iki kontrol yontemi (parmak vs ok/otomatik) CATISMAZ,
// ikisi de tek gercek durumu (scroll pozisyonu) degistirir; ayri bir "hangi
// kart aktif" state'i tutulmaz.
export function MagazaKaydirici({ magazalar }: { magazalar: MagazaKartiVeri[] }) {
  const konteynerRef = useRef<HTMLDivElement>(null);
  const zamanlayiciRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Iki kart arasi mesafe (kart genisligi + bosluk) DOM'dan olculur - CSS
  // breakpoint'ine gore (mobil 2'li / sm+ 3'lu) degistigi icin sabit px
  // varsayilmaz.
  const adimGenisligi = useCallback(() => {
    const konteyner = konteynerRef.current;
    if (!konteyner || konteyner.children.length < 2) return konteyner?.clientWidth ?? 0;
    const ilk = konteyner.children[0] as HTMLElement;
    const ikinci = konteyner.children[1] as HTMLElement;
    return ikinci.offsetLeft - ilk.offsetLeft;
  }, []);

  // yon=1 ileri, yon=-1 geri. Uctan uca gelince BASA/SONA sarar (loop) -
  // carousel hic durmadan donsun diye; oklar hicbir zaman devre disi kalmaz.
  const ilerle = useCallback(
    (yon: 1 | -1) => {
      const konteyner = konteynerRef.current;
      if (!konteyner) return;
      const adim = adimGenisligi();
      const maxKaydirma = konteyner.scrollWidth - konteyner.clientWidth;
      if (maxKaydirma <= 0) return;

      const hedef = konteyner.scrollLeft + yon * adim;
      if (yon === 1 && hedef >= maxKaydirma - 4) {
        konteyner.scrollTo({ left: 0, behavior: "smooth" });
      } else if (yon === -1 && hedef <= 4) {
        konteyner.scrollTo({ left: maxKaydirma, behavior: "smooth" });
      } else {
        konteyner.scrollBy({ left: yon * adim, behavior: "smooth" });
      }
    },
    [adimGenisligi],
  );

  const zamanlayiciBaslat = useCallback(() => {
    if (zamanlayiciRef.current) clearInterval(zamanlayiciRef.current);
    if (magazalar.length <= 1) return;
    zamanlayiciRef.current = setInterval(() => ilerle(1), OTOMATIK_ILERLEME_MS);
  }, [ilerle, magazalar.length]);

  const zamanlayiciDurdur = useCallback(() => {
    if (zamanlayiciRef.current) clearInterval(zamanlayiciRef.current);
  }, []);

  useEffect(() => {
    zamanlayiciBaslat();
    const konteyner = konteynerRef.current;
    // Parmakla/mouse ile surukleme sirasinda otomatik ilerleme DURUR - aksi
    // halde kullanici kaydirirken goruntu altindan kayar (kotu UX). pointerdown
    // hem dokunmatik hem mouse'u tek olayla kapsar.
    konteyner?.addEventListener("pointerdown", zamanlayiciDurdur);
    konteyner?.addEventListener("pointerup", zamanlayiciBaslat);
    konteyner?.addEventListener("pointerleave", zamanlayiciBaslat);
    return () => {
      zamanlayiciDurdur();
      konteyner?.removeEventListener("pointerdown", zamanlayiciDurdur);
      konteyner?.removeEventListener("pointerup", zamanlayiciBaslat);
      konteyner?.removeEventListener("pointerleave", zamanlayiciBaslat);
    };
  }, [zamanlayiciBaslat, zamanlayiciDurdur]);

  function okTiklandi(yon: 1 | -1) {
    ilerle(yon);
    // Manuel tiklama sonrasi sayaci sifirla - otomatik ilerleme hemen ustune
    // binmesin (kullanici az once baktigi karti bir-iki saniyede tekrar
    // kaydirmasin).
    zamanlayiciBaslat();
  }

  return (
    <div className="relative">
      <div
        ref={konteynerRef}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1 sm:gap-4"
      >
        {magazalar.map((magaza) => (
          <div
            key={magaza.id}
            className="w-[calc((100%-12px)/2)] shrink-0 snap-start sm:w-[calc((100%-32px)/3)]"
          >
            <MagazaKarti magaza={magaza} />
          </div>
        ))}
      </div>
      {magazalar.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => okTiklandi(-1)}
            aria-label="Önceki tezgahlar"
            className="absolute left-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white text-primary-600 shadow-md ring-1 ring-inset ring-neutral-200 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={() => okTiklandi(1)}
            aria-label="Sonraki tezgahlar"
            className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white text-primary-600 shadow-md ring-1 ring-inset ring-neutral-200 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </>
      )}
    </div>
  );
}
