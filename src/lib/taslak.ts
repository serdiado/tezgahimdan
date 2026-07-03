"use client";

import { useEffect } from "react";

// Basit taslak (draft) kalici hafizasi: form METIN alanlarini localStorage'a
// yazar ki satici yarim birakip donunce kaybolmasin. Fotograflar YAZILMAZ
// (localStorage boyut siniri; blob'lar buraya sigmaz) - bilincli sinir.

export function taslakOku<T>(anahtar: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const ham = window.localStorage.getItem(anahtar);
    return ham ? (JSON.parse(ham) as T) : null;
  } catch {
    return null;
  }
}

export function taslakTemizle(anahtar: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(anahtar);
  } catch {
    // yok say (or. private mode kotasi)
  }
}

// degerler her degistiginde debounce ile yazar. `aktif=false` iken (or. basari
// ekraninda) yazmayi durdurur.
export function useTaslakYaz(anahtar: string, degerler: unknown, aktif = true): void {
  const seri = JSON.stringify(degerler);
  useEffect(() => {
    if (!aktif) return;
    const zaman = setTimeout(() => {
      try {
        window.localStorage.setItem(anahtar, seri);
      } catch {
        // yok say
      }
    }, 500);
    return () => clearTimeout(zaman);
  }, [anahtar, seri, aktif]);
}
