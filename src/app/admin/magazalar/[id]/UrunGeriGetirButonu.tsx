"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";

export function UrunGeriGetirButonu({ urunId }: { urunId: string }) {
  const router = useRouter();
  const [bekliyor, setBekliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  async function geriGetir() {
    setHata(null);
    setBekliyor(true);
    const res = await fetch("/api/admin/magaza-urun-geri-getir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: urunId }),
    });
    setBekliyor(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setHata(data.hata ?? "işlem başarısız");
      return;
    }
    router.refresh();
  }

  return (
    <span>
      <button
        type="button"
        onClick={geriGetir}
        disabled={bekliyor}
        className="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:underline disabled:opacity-60"
      >
        <RotateCcw className="h-3 w-3" strokeWidth={2} />
        Geri Getir
      </button>
      {hata && <span className="ml-2 text-xs text-red-600">{hata}</span>}
    </span>
  );
}
