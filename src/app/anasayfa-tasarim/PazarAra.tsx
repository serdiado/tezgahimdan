"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import type { MockPazar } from "./mock-veri";

// VitrinArama.tsx ile AYNI "yazdikca oner" deseni - ama bu sayfa router.push
// ETMEZ. Coklu-pazar dunyasinda arama "URL degistirip sunucuyu yeniden
// sorgulatma" degil, "sayfadaki ilgili karta kaydir" olacak (bu prototip tek
// sayfa, hicbir yere gitmiyor). Gercek uygulamada arama VitrinArama'nin
// yaptigi gibi calismaya devam eder - burada sadece navigasyon HISSINI
// gostermek yeterli.
export function PazarAra({ pazarlar }: { pazarlar: MockPazar[] }) {
  const [sorgu, setSorgu] = useState("");
  const [acik, setAcik] = useState(false);
  const kutuRef = useRef<HTMLDivElement>(null);

  const oneriler =
    sorgu.trim().length > 0
      ? pazarlar
          .filter((p) => `${p.ilce} ${p.il}`.toLocaleLowerCase("tr-TR").includes(sorgu.trim().toLocaleLowerCase("tr-TR")))
          .slice(0, 6)
      : [];

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

  function pazaraGit(pazar: MockPazar) {
    setSorgu(pazar.ilce);
    setAcik(false);
    document.getElementById(`pazar-${pazar.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div ref={kutuRef} className="relative">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (oneriler[0]) pazaraGit(oneriler[0]);
        }}
        className="flex items-center gap-2 rounded-full bg-white px-4 py-3 shadow-md"
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
          placeholder="Hangi şehirde/ilçede pazar var?"
          className="w-full bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
        />
        {sorgu && (
          <button
            type="button"
            onClick={() => {
              setSorgu("");
              setAcik(false);
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
                onClick={() => pazaraGit(p)}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-neutral-800 hover:bg-neutral-100"
              >
                <span className="font-medium">{p.ilce}</span>
                <span className="text-neutral-500">, {p.il}</span>
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
