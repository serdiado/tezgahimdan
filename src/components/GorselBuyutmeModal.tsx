"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { ZoomluGorsel } from "@/components/ZoomluGorsel";

// UrunDetayModal.tsx'teki foto-buyutme deseniyle AYNI (ZoomluGorsel paylasilan
// bileseni + body-scroll-lock) - tek farki tek bir statik gorsel icin sade bir
// kapali modal olmasi (foto seridi/urun bilgisi yok). Magaza kroki fotografi
// (MagazaHero.tsx) icin: eskiden yeni sekmede acilan link, artik ayni sayfada
// buyuteç+pinch-zoom.
export function GorselBuyutmeModal({
  foto,
  alt,
  onClose,
}: {
  foto: string;
  alt: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const oncekiOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = oncekiOverflow;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* UrunDetayModal.tsx ile ayni konum deseni: gorselin USTUNE bindirilmis
            (disina/yukarisina degil) - kisa viewport'larda (ör. dar mobil
            ekranlar) modalin ekran disina tasmasi riskini ortadan kaldirir
            (canli test sirasinda -top-10 ile YAKALANAN bir hataydi). */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Kapat"
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-neutral-600 shadow-sm hover:bg-white hover:text-neutral-900"
        >
          <X className="h-5 w-5" strokeWidth={2} />
        </button>
        <ZoomluGorsel foto={foto} alt={alt} />
      </div>
    </div>
  );
}
