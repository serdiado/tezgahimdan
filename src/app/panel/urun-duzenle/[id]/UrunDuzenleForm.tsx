"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { MAX_FOTOGRAF } from "@/lib/urun-sabitleri";

export type UrunDuzenleVeri = {
  id: string;
  kategoriId: string;
  baslik: string;
  aciklama: string | null;
  fiyat: number;
  stokAdedi: number;
  fotograflar: string[];
};

export function UrunDuzenleForm({
  urun,
  kategoriler,
  minStok,
}: {
  urun: UrunDuzenleVeri;
  kategoriler: { id: string; ad: string }[];
  minStok: number;
}) {
  const router = useRouter();
  const [kalanFotograflar, setKalanFotograflar] = useState<string[]>(urun.fotograflar);
  const [hata, setHata] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  function fotografKaldir(yol: string) {
    setKalanFotograflar((onceki) => onceki.filter((f) => f !== yol));
  }

  async function submit(formData: FormData) {
    setHata(null);

    const yeniFotograflar = formData
      .getAll("fotograflar")
      .filter((f) => f instanceof File && f.size > 0);
    const toplamFotograf = kalanFotograflar.length + yeniFotograflar.length;
    if (toplamFotograf < 1) {
      setHata("en az 1 fotoğraf kalmalı");
      return;
    }
    if (toplamFotograf > MAX_FOTOGRAF) {
      setHata(`en fazla ${MAX_FOTOGRAF} fotoğraf olabilir`);
      return;
    }

    formData.set("id", urun.id);
    formData.set("kalanFotograflar", JSON.stringify(kalanFotograflar));

    setGonderiliyor(true);
    const res = await fetch("/api/panel/urun-duzenle", {
      method: "POST",
      body: formData,
    });
    setGonderiliyor(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setHata(data.hata ?? "ürün güncellenemedi");
      return;
    }

    router.push("/panel/urunlerim");
    router.refresh();
  }

  return (
    <form action={submit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-neutral-700">
          Fotoğraflar (1-{MAX_FOTOGRAF} adet)
        </label>
        {kalanFotograflar.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {kalanFotograflar.map((yol) => (
              <div key={yol} className="relative h-20 w-20 overflow-hidden rounded-lg bg-neutral-100">
                <Image src={yol} alt="" fill className="object-cover" sizes="80px" />
                <button
                  type="button"
                  onClick={() => fotografKaldir(yol)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white"
                  aria-label="Fotoğrafı kaldır"
                >
                  <X className="h-3 w-3" strokeWidth={3} />
                </button>
              </div>
            ))}
          </div>
        )}
        <input
          name="fotograflar"
          type="file"
          accept="image/*"
          multiple
          className="mt-2 block w-full text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">
          Kategori
          <select
            name="kategoriId"
            required
            defaultValue={urun.kategoriId}
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            {kategoriler.map((k) => (
              <option key={k.id} value={k.id}>
                {k.ad}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">
          Başlık
          <input
            name="baslik"
            type="text"
            required
            defaultValue={urun.baslik}
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">
          Açıklama (opsiyonel)
          <textarea
            name="aciklama"
            defaultValue={urun.aciklama ?? ""}
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">
          Fiyat (TL)
          <input
            name="fiyat"
            type="number"
            step="0.01"
            min="0.01"
            required
            defaultValue={urun.fiyat}
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">
          Stok Adedi
          <input
            name="stokAdedi"
            type="number"
            step="1"
            min={minStok || 1}
            required
            defaultValue={urun.stokAdedi}
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        {minStok > 0 && (
          <p className="mt-1 text-xs text-neutral-400">
            {minStok} bekleyen/satılmış hak sahibi olduğu için stok bunun altına düşürülemez.
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={gonderiliyor}
        className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
      >
        Kaydet
      </button>
      {hata && <p className="text-sm text-red-600">{hata}</p>}
    </form>
  );
}
