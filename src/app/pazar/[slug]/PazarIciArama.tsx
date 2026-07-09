"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

// VitrinArama'nin (anasayfa) pazar-ici kardesi: AYNI gorsel dil (yuvarlak
// input + buyutec + X temizle) ama bolge/pazar onerisi YOK - arama bu pazarin
// KENDI urun ve tezgahlarinda yapilir (?q= ile sunucu tarafinda filtrelenir,
// bkz. page.tsx sorgulari). Oneri listesi bilincli eklenmedi: pazar-ici arama
// zaten dar bir kapsam, yazip Enter yeterli (kutsal kural - sadelik).
export function PazarIciArama({
  pazarSlug,
  baslangicSorgu,
}: {
  pazarSlug: string;
  baslangicSorgu: string;
}) {
  const router = useRouter();
  const [sorgu, setSorgu] = useState(baslangicSorgu);

  function ara(deger: string) {
    const temiz = deger.trim();
    if (!temiz) {
      router.push(`/pazar/${pazarSlug}`);
      return;
    }
    router.push(`/pazar/${pazarSlug}?q=${encodeURIComponent(temiz)}`);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        ara(sorgu);
      }}
      className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2.5 shadow-sm focus-within:border-primary-400"
    >
      <Search className="h-4 w-4 shrink-0 text-neutral-400" strokeWidth={2} />
      <input
        type="text"
        value={sorgu}
        onChange={(e) => setSorgu(e.target.value)}
        placeholder="Bu pazarda ürün veya tezgah ara"
        className="w-full bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
      />
      {sorgu && (
        <button
          type="button"
          onClick={() => {
            setSorgu("");
            router.push(`/pazar/${pazarSlug}`);
          }}
          aria-label="Aramayı temizle"
          className="shrink-0 text-neutral-400 hover:text-neutral-600"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      )}
    </form>
  );
}
