"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";

export function GuvenilirlikSifirlaButonu({ kullaniciId }: { kullaniciId: string }) {
  const router = useRouter();
  const [onay, setOnay] = useState(false);
  const [bekliyor, setBekliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  async function sifirla() {
    setHata(null);
    setBekliyor(true);
    const res = await fetch("/api/admin/kullanici-guvenilirlik-sifirla", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kullaniciId }),
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

  if (onay) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-neutral-600">Emin misin?</span>
        <button
          type="button"
          onClick={sifirla}
          disabled={bekliyor}
          className="rounded-md bg-primary-500 px-2 py-1 text-xs font-semibold text-white hover:bg-primary-600 disabled:opacity-60"
        >
          Evet
        </button>
        <button
          type="button"
          onClick={() => setOnay(false)}
          className="rounded-md bg-neutral-200 px-2 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-300"
        >
          Vazgeç
        </button>
        {hata && <p className="text-xs text-red-600">{hata}</p>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOnay(true)}
      className="flex items-center gap-1 rounded-md border border-neutral-300 px-2 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
    >
      <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
      Güvenilirliği Sıfırla
    </button>
  );
}
