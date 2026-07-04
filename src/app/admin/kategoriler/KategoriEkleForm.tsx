"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function KategoriEkleForm() {
  const router = useRouter();
  const [ad, setAd] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  async function ekle(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    if (!ad.trim()) {
      setHata("kategori adı zorunlu");
      return;
    }
    setGonderiliyor(true);
    const res = await fetch("/api/admin/kategori-olustur", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ad: ad.trim() }),
    });
    setGonderiliyor(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setHata(data.hata ?? "kategori eklenemedi");
      return;
    }
    setAd("");
    router.refresh();
  }

  return (
    <form onSubmit={ekle} className="mt-4 flex flex-wrap items-start gap-2">
      <input
        type="text"
        value={ad}
        onChange={(e) => setAd(e.target.value)}
        placeholder="Yeni kategori adı"
        maxLength={50}
        className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
      />
      <button
        type="submit"
        disabled={gonderiliyor}
        className="rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
      >
        + Ekle
      </button>
      {hata && <p className="w-full text-sm text-red-600">{hata}</p>}
    </form>
  );
}
