"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

export type AramaPazarVeri = { id: string; il: string; ilce: string; semt: string | null };

// Google tarzi "yazdikca oner" arama: ayri bir filtre kutucugu/dropdown YOK,
// sadece bu tek input + oneri listesi. Sunucuya her tus vurusunda gitmez -
// zaten kucuk olan pazarlar listesi (server'dan gelen) istemcide filtrelenir,
// sadece gonderiminde (Enter / oneri tiklama) URL degisip Magazalar bolumu
// sunucu tarafinda yeniden filtrelenir (bkz. page.tsx "magazalar" sorgusu).
export function VitrinArama({
  pazarlar,
  baslangicSorgu,
}: {
  pazarlar: AramaPazarVeri[];
  baslangicSorgu: string;
}) {
  const router = useRouter();
  const [sorgu, setSorgu] = useState(baslangicSorgu);
  const [acik, setAcik] = useState(false);
  const kutuRef = useRef<HTMLDivElement>(null);

  const oneriler =
    sorgu.trim().length > 0
      ? pazarlar
          .filter((p) => {
            const hedef = `${p.ilce} ${p.il} ${p.semt ?? ""}`.toLocaleLowerCase("tr-TR");
            return hedef.includes(sorgu.trim().toLocaleLowerCase("tr-TR"));
          })
          .slice(0, 6)
      : [];

  // Disari tiklama + Escape ile kapatma - HaftalikRitim.tsx'teki ayni desen.
  useEffect(() => {
    if (!acik) return;
    function disariTikla(e: PointerEvent) {
      if (kutuRef.current && !kutuRef.current.contains(e.target as Node)) setAcik(false);
    }
    function kacTusu(e: KeyboardEvent) {
      if (e.key === "Escape") setAcik(false);
    }
    document.addEventListener("pointerdown", disariTikla);
    document.addEventListener("keydown", kacTusu);
    return () => {
      document.removeEventListener("pointerdown", disariTikla);
      document.removeEventListener("keydown", kacTusu);
    };
  }, [acik]);

  function ara(deger: string) {
    const temiz = deger.trim();
    if (!temiz) {
      router.push("/");
      return;
    }
    // Anchor YOK: hem urunler ("Yeni Ürünler") hem magazalar ayni
    // sorguyla filtrelendigi icin sonuc zaten arama kutusunun hemen
    // altinda gorunur, uzak bir bolume kaydirmaya gerek yok.
    router.push(`/?q=${encodeURIComponent(temiz)}`);
  }

  return (
    <div ref={kutuRef} className="relative">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setAcik(false);
          ara(sorgu);
        }}
        className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2.5 shadow-sm focus-within:border-primary-400"
      >
        <Search className="h-4 w-4 shrink-0 text-neutral-400" strokeWidth={2} />
        <input
          type="text"
          value={sorgu}
          onChange={(e) => {
            setSorgu(e.target.value);
            setAcik(true);
          }}
          onFocus={() => setAcik(true)}
          placeholder="Hangi şehirde pazar var? (ör. İzmir)"
          className="w-full bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
        />
        {sorgu && (
          <button
            type="button"
            onClick={() => {
              setSorgu("");
              setAcik(false);
              router.push("/");
            }}
            aria-label="Aramayı temizle"
            className="shrink-0 text-neutral-400 hover:text-neutral-600"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        )}
      </form>

      {acik && sorgu.trim().length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-xl bg-white p-1.5 shadow-lg">
          {oneriler.length > 0 ? (
            oneriler.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setSorgu(p.ilce);
                  setAcik(false);
                  ara(p.ilce);
                }}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-neutral-800 hover:bg-neutral-100"
              >
                <span className="font-medium">{p.ilce}</span>
                <span className="text-neutral-500">
                  , {p.il}
                  {p.semt ? ` (${p.semt})` : ""}
                </span>
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-sm text-neutral-500">Bu bölgede henüz pazarımız yok.</p>
          )}
        </div>
      )}
    </div>
  );
}
