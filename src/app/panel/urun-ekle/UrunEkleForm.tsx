"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MAX_FOTOGRAF } from "@/lib/urun-sabitleri";

export function UrunEkleForm({ kategoriler }: { kategoriler: { id: string; ad: string }[] }) {
  const router = useRouter();
  const [hata, setHata] = useState<string | null>(null);
  const [basarili, setBasarili] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  async function submit(formData: FormData) {
    setHata(null);
    setBasarili(null);

    const fotograflar = formData.getAll("fotograflar").filter((f) => f instanceof File && f.size > 0);
    if (fotograflar.length < 1) {
      setHata("en az 1 fotoğraf zorunlu");
      return;
    }
    if (fotograflar.length > MAX_FOTOGRAF) {
      setHata(`en fazla ${MAX_FOTOGRAF} fotoğraf yükleyebilirsin`);
      return;
    }

    setGonderiliyor(true);
    const res = await fetch("/api/panel/urun-ekle", {
      method: "POST",
      body: formData,
    });
    setGonderiliyor(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setHata(data.hata ?? "ürün eklenemedi");
      return;
    }

    const data = await res.json();
    setBasarili(`Ürün eklendi (id: ${data.id})`);
    router.refresh();
  }

  return (
    <form action={submit}>
      <div>
        <label>
          Fotoğraflar (1-{MAX_FOTOGRAF} adet)
          <input name="fotograflar" type="file" accept="image/*" multiple required />
        </label>
      </div>
      <div>
        <label>
          Kategori
          <select name="kategoriId" required defaultValue="">
            <option value="" disabled>
              Seçiniz
            </option>
            {kategoriler.map((k) => (
              <option key={k.id} value={k.id}>
                {k.ad}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div>
        <label>
          Başlık
          <input name="baslik" type="text" required />
        </label>
      </div>
      <div>
        <label>
          Açıklama (opsiyonel)
          <textarea name="aciklama" />
        </label>
      </div>
      <div>
        <label>
          Fiyat (TL)
          <input name="fiyat" type="number" step="0.01" min="0.01" required />
        </label>
      </div>
      <div>
        <label>
          Stok Adedi
          <input name="stokAdedi" type="number" step="1" min="1" defaultValue={1} required />
        </label>
      </div>
      <button type="submit" disabled={gonderiliyor}>
        Ürünü Ekle
      </button>
      {hata && <p style={{ color: "red" }}>{hata}</p>}
      {basarili && <p style={{ color: "green" }}>{basarili}</p>}
    </form>
  );
}
