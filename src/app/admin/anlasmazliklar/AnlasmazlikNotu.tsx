"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";

export function AnlasmazlikNotu({ id, not }: { id: string; not: string | null }) {
  const router = useRouter();
  const [duzenleniyor, setDuzenleniyor] = useState(false);
  const [taslak, setTaslak] = useState(not ?? "");
  const [bekliyor, setBekliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  async function kaydet() {
    setHata(null);
    setBekliyor(true);
    const res = await fetch("/api/admin/anlasmazlik-not", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, not: taslak }),
    });
    setBekliyor(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setHata(data.hata ?? "işlem başarısız");
      return;
    }
    setDuzenleniyor(false);
    router.refresh();
  }

  if (!duzenleniyor) {
    return (
      <div className="mt-2">
        {not ? (
          <p className="rounded-lg bg-neutral-50 px-2 py-1 text-xs text-neutral-600">{not}</p>
        ) : null}
        <button
          type="button"
          onClick={() => setDuzenleniyor(true)}
          className="mt-1 flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline"
        >
          <Pencil className="h-3 w-3" strokeWidth={2} />
          {not ? "Notu düzenle" : "Not ekle"}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <textarea
        value={taslak}
        onChange={(e) => setTaslak(e.target.value)}
        maxLength={500}
        rows={2}
        placeholder="Bu anlaşmazlık için kısa bir not (ör. inceleme sonucu, iletişim geçmişi)"
        className="w-full rounded-lg border border-neutral-300 px-2 py-1 text-xs focus:border-primary-500 focus:outline-none"
      />
      <div className="mt-1 flex items-center gap-2">
        <button
          type="button"
          onClick={kaydet}
          disabled={bekliyor}
          className="rounded-md bg-primary-500 px-2 py-1 text-xs font-semibold text-white hover:bg-primary-600 disabled:opacity-60"
        >
          Kaydet
        </button>
        <button
          type="button"
          onClick={() => {
            setTaslak(not ?? "");
            setDuzenleniyor(false);
          }}
          className="rounded-md bg-neutral-200 px-2 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-300"
        >
          Vazgeç
        </button>
      </div>
      {hata && <p className="mt-1 text-xs text-red-600">{hata}</p>}
    </div>
  );
}
