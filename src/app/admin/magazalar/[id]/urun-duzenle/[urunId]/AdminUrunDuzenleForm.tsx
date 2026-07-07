"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FotografSecici, type FotoOge } from "@/components/FotografSecici";

export type UrunDuzenleVeri = {
  id: string;
  kategoriId: string;
  baslik: string;
  aciklama: string | null;
  fiyat: number;
  stokAdedi: number;
  fotograflar: string[];
};

type SiraOge = { tur: "mevcut"; yol: string } | { tur: "yeni"; index: number };

// panel/urun-duzenle/[id]/UrunDuzenleForm.tsx'in admin muadili - AdminUrunEkleForm
// ile ayni gerekce (ayri, kucuk bilesen; satici-ozel kolayliklar gereksiz).
// Tek davranissal fark: basari sonrasi /panel/urunlerim yerine magaza detay
// sayfasina doner.
export function AdminUrunDuzenleForm({
  magazaId,
  urun,
  kategoriler,
  minStok,
}: {
  magazaId: string;
  urun: UrunDuzenleVeri;
  kategoriler: { id: string; ad: string }[];
  minStok: number;
}) {
  const router = useRouter();
  const [fotolar, setFotolar] = useState<FotoOge[]>([]);
  const [fotoIsleniyor, setFotoIsleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [kaldirOnay, setKaldirOnay] = useState(false);
  const [kaldiriliyor, setKaldiriliyor] = useState(false);

  async function kaldir() {
    setHata(null);
    setKaldiriliyor(true);
    const res = await fetch("/api/admin/magaza-urun-kaldir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: urun.id }),
    });
    setKaldiriliyor(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setHata(data.hata ?? "ürün kaldırılamadı");
      setKaldirOnay(false);
      return;
    }
    router.push(`/admin/magazalar/${magazaId}`);
    router.refresh();
  }

  async function gonder(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setHata(null);
    if (fotolar.length < 1) {
      setHata("en az 1 fotoğraf kalmalı");
      return;
    }

    const fd = new FormData(e.currentTarget);
    fd.set("id", urun.id);
    const siralama: SiraOge[] = [];
    let yeniIndex = 0;
    for (const oge of fotolar) {
      if (oge.tur === "mevcut") {
        siralama.push({ tur: "mevcut", yol: oge.yol });
      } else {
        fd.append("fotograflar", oge.file);
        siralama.push({ tur: "yeni", index: yeniIndex });
        yeniIndex++;
      }
    }
    fd.set("siralama", JSON.stringify(siralama));

    setGonderiliyor(true);
    const res = await fetch("/api/admin/magaza-urun-duzenle", { method: "POST", body: fd });
    setGonderiliyor(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setHata(data.hata ?? "ürün güncellenemedi");
      return;
    }

    router.push(`/admin/magazalar/${magazaId}`);
    router.refresh();
  }

  const inputClass =
    "mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500";

  return (
    <form onSubmit={gonder} className="space-y-5">
      <FotografSecici
        baslangicMevcut={urun.fotograflar}
        onDegisim={setFotolar}
        onIsleniyorDegisti={setFotoIsleniyor}
      />

      <div>
        <label className="block text-sm font-medium text-neutral-700">
          Kategori
          <select name="kategoriId" required defaultValue={urun.kategoriId} className={inputClass}>
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
          <input name="baslik" type="text" required defaultValue={urun.baslik} className={inputClass} />
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">
          Açıklama <span className="font-normal text-neutral-400">(opsiyonel)</span>
          <textarea name="aciklama" rows={3} defaultValue={urun.aciklama ?? ""} className={inputClass} />
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
            inputMode="decimal"
            defaultValue={urun.fiyat}
            className={inputClass}
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
            inputMode="numeric"
            defaultValue={urun.stokAdedi}
            className={inputClass}
          />
        </label>
        {minStok > 0 && (
          <p className="mt-1 text-xs text-neutral-400">
            {minStok} bekleyen/satılmış hak sahibi olduğu için stok bunun altına düşürülemez.
          </p>
        )}
      </div>

      {hata && <p className="text-sm text-red-600">{hata}</p>}

      <button
        type="submit"
        disabled={gonderiliyor || fotoIsleniyor}
        className="w-full rounded-md bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
      >
        {fotoIsleniyor ? "Fotoğraflar hazırlanıyor…" : gonderiliyor ? "Kaydediliyor…" : "Kaydet"}
      </button>

      <div className="border-t border-neutral-200 pt-4">
        {kaldirOnay ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-neutral-600">Bu ürün kaldırılsın mı?</span>
            <button
              type="button"
              onClick={kaldir}
              disabled={kaldiriliyor}
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              Evet, Kaldır
            </button>
            <button
              type="button"
              onClick={() => setKaldirOnay(false)}
              className="rounded-md bg-neutral-200 px-3 py-1.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-300"
            >
              Vazgeç
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setKaldirOnay(true)}
            className="text-sm font-semibold text-red-600 hover:underline"
          >
            Bu ürünü kaldır
          </button>
        )}
      </div>
    </form>
  );
}
