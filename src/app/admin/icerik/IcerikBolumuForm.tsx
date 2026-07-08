"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type IcerikAlani = { anahtar: string; etiket: string; deger: string; cokSatirli?: boolean; placeholder?: string };

export function IcerikBolumuForm({ baslik, not, alanlar }: { baslik: string; not?: string; alanlar: IcerikAlani[] }) {
  const router = useRouter();
  const [degerler, setDegerler] = useState<Record<string, string>>(
    Object.fromEntries(alanlar.map((a) => [a.anahtar, a.deger])),
  );
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [basarili, setBasarili] = useState(false);

  async function kaydet(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    setBasarili(false);
    setGonderiliyor(true);
    const res = await fetch("/api/admin/site-icerik-guncelle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alanlar: degerler }),
    });
    setGonderiliyor(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setHata(data.hata ?? "kaydedilemedi");
      return;
    }
    setBasarili(true);
    router.refresh();
  }

  const inputClass =
    "mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500";

  return (
    <form onSubmit={kaydet} className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-neutral-900">{baslik}</h2>
      {not && <p className="mt-1 text-xs text-neutral-500">{not}</p>}

      <div className="mt-3 space-y-4">
        {alanlar.map((alan) => (
          <label key={alan.anahtar} className="block text-sm font-medium text-neutral-700">
            {alan.etiket}
            {alan.cokSatirli ? (
              <textarea
                value={degerler[alan.anahtar]}
                onChange={(e) => setDegerler((d) => ({ ...d, [alan.anahtar]: e.target.value }))}
                rows={6}
                maxLength={5000}
                placeholder={alan.placeholder}
                className={inputClass}
              />
            ) : (
              <input
                type="text"
                value={degerler[alan.anahtar]}
                onChange={(e) => setDegerler((d) => ({ ...d, [alan.anahtar]: e.target.value }))}
                maxLength={300}
                placeholder={alan.placeholder}
                className={inputClass}
              />
            )}
          </label>
        ))}
      </div>

      {hata && <p className="mt-2 text-sm text-red-600">{hata}</p>}
      {basarili && !hata && <p className="mt-2 text-sm text-green-700">Kaydedildi.</p>}

      <button
        type="submit"
        disabled={gonderiliyor}
        className="mt-4 rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
      >
        {gonderiliyor ? "Kaydediliyor…" : "Kaydet"}
      </button>
    </form>
  );
}
