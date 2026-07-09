"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldOff, ShieldCheck } from "lucide-react";

export function KullaniciYasaklaButonu({ kullaniciId, yasakliMi }: { kullaniciId: string; yasakliMi: boolean }) {
  const router = useRouter();
  const [onay, setOnay] = useState(false);
  const [bekliyor, setBekliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  async function yasaklaKaldir(yasakla: boolean) {
    setHata(null);
    setBekliyor(true);
    const res = await fetch("/api/admin/kullanici-yasakla", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kullaniciId, yasakla }),
    });
    setBekliyor(false);
    setOnay(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setHata(data.hata ?? "işlem başarısız");
      return;
    }
    router.refresh();
  }

  if (yasakliMi) {
    return (
      <div>
        <button
          type="button"
          onClick={() => yasaklaKaldir(false)}
          disabled={bekliyor}
          className="flex items-center gap-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 disabled:opacity-60"
        >
          <ShieldCheck className="h-4 w-4" strokeWidth={2} />
          Yasağı Kaldır
        </button>
        {hata && <p className="mt-2 text-xs text-red-600">{hata}</p>}
      </div>
    );
  }

  return (
    <div>
      {onay ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-neutral-600">
            Yasaklanınca yeni rezervasyon/tezgah/yorum/şikayet oluşturamaz. Emin misin?
          </span>
          <button
            type="button"
            onClick={() => yasaklaKaldir(true)}
            disabled={bekliyor}
            className="rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            Evet, Yasakla
          </button>
          <button
            type="button"
            onClick={() => setOnay(false)}
            className="rounded-md bg-neutral-200 px-2 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-300"
          >
            Vazgeç
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOnay(true)}
          className="flex items-center gap-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-100"
        >
          <ShieldOff className="h-4 w-4" strokeWidth={2} />
          Yasakla
        </button>
      )}
      {hata && <p className="mt-2 text-xs text-red-600">{hata}</p>}
    </div>
  );
}
