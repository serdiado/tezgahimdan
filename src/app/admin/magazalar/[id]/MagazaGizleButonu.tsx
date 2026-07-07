"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

// MagazaKartAdmin.tsx'teki gizle/goster mantigiyla AYNI (liste karti icin
// zaten var) - detay sayfasinda da ayni aksiyon gerekli, kucuk bir bilesen
// olarak burada tekrarlaniyor (iki yerde de kullanilan tam ekran/kart
// baglami farkli, ortak bir bilesene cikarmak fazla soyutlama olurdu).
export function MagazaGizleButonu({ magazaId, gizliMi }: { magazaId: string; gizliMi: boolean }) {
  const router = useRouter();
  const [gizleOnay, setGizleOnay] = useState(false);
  const [bekliyor, setBekliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  async function gizleGoster(gizle: boolean) {
    setHata(null);
    setBekliyor(true);
    const res = await fetch("/api/admin/magaza-gizle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ magazaId, gizle }),
    });
    setBekliyor(false);
    setGizleOnay(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setHata(data.hata ?? "işlem başarısız");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      {gizliMi ? (
        <button
          type="button"
          onClick={() => gizleGoster(false)}
          disabled={bekliyor}
          className="flex items-center gap-1 rounded-md border border-neutral-300 px-2 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 disabled:opacity-60"
        >
          <Eye className="h-3.5 w-3.5" strokeWidth={2} />
          Göster
        </button>
      ) : gizleOnay ? (
        <span className="flex flex-wrap items-center gap-1">
          <span className="text-xs text-neutral-600">Vitrinden kaldırılsın mı?</span>
          <button
            type="button"
            onClick={() => gizleGoster(true)}
            disabled={bekliyor}
            className="rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            Evet
          </button>
          <button
            type="button"
            onClick={() => setGizleOnay(false)}
            className="rounded-md bg-neutral-200 px-2 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-300"
          >
            Vazgeç
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setGizleOnay(true)}
          className="flex items-center gap-1 rounded-md border border-neutral-300 px-2 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
        >
          <EyeOff className="h-3.5 w-3.5" strokeWidth={2} />
          Gizle
        </button>
      )}
      {hata && <p className="mt-2 text-xs text-red-600">{hata}</p>}
    </div>
  );
}
