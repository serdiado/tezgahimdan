"use client";

import { useEffect } from "react";

// Kaydedilmemis degisiklik varken sayfadan ayrilmaya calisilirsa kullaniciyi
// uyarir. Iki katman: (1) tarayici seviyesi (sekme kapatma/yenileme/adres
// cubuguna yeni URL yazma) - native beforeunload, tarayicinin KENDI diyalogu
// (metin ozellestirilemez, tarayicilar guvenlik geregi jenerik bir mesaj
// gosterir). (2) Uygulama-ici navigasyon (Link tiklama) - Next.js App
// Router'da resmi bir "navigasyonu engelle" hook'u yok; capture-phase'te <a>
// tiklamalarini Next.js'in KENDI (bubble-phase) tiklama isleyicisinden ONCE
// yakalayip window.confirm ile onay alan, reddedilirse navigasyonu tamamen
// durduran bir cozum.
export function useDegisiklikUyarisi(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;

    function beforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener("beforeunload", beforeUnload);

    function linkTiklandi(e: MouseEvent) {
      const link = (e.target as HTMLElement | null)?.closest("a");
      if (!link || !link.href) return;
      // Yeni sekme (target=_blank) ya da modifier tuslu tiklama (yeni sekmede
      // ac) tarayicinin kendi davranisina birakilir, mudahale edilmez.
      if (link.target === "_blank" || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const hedefUrl = new URL(link.href, window.location.href);
      if (hedefUrl.href === window.location.href) return;
      const devamEt = window.confirm(
        "Kaydedilmemiş değişiklikleriniz var. Bu sayfadan ayrılırsanız kaybolacaklar. Yine de ayrılmak istiyor musunuz?",
      );
      if (!devamEt) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }
    document.addEventListener("click", linkTiklandi, true);

    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", linkTiklandi, true);
    };
  }, [dirty]);
}
