"use client";

import { createElement, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { FotografSecici, type FotoOge } from "@/components/FotografSecici";
import { kategoriIkonuSec, kategoriRengiSec } from "@/lib/kategori-renkleri";

// UrunEkleForm'un (satici) sadelestirilmis admin muadili - taslak-kaydetme ve
// paylasim-karti basari ekrani gibi satici-ozel kolayliklar burada gereksiz
// (tek seferlik admin islemi), o yuzden ayri, kucuk bir bilesen.
export function AdminUrunEkleForm({
  magazaId,
  magazaAd,
  kategoriler,
}: {
  magazaId: string;
  magazaAd: string;
  kategoriler: { id: string; ad: string }[];
}) {
  const [fotolar, setFotolar] = useState<FotoOge[]>([]);
  const [fotoIsleniyor, setFotoIsleniyor] = useState(false);
  const [kategoriId, setKategoriId] = useState("");
  const [baslik, setBaslik] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [fiyat, setFiyat] = useState("");
  const [stok, setStok] = useState("1");
  const [hata, setHata] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [basariBaslik, setBasariBaslik] = useState<string | null>(null);

  async function gonder(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    if (fotolar.length < 1) {
      setHata("en az 1 fotoğraf ekleyin");
      return;
    }
    if (!kategoriId) {
      setHata("kategori seçin");
      return;
    }

    const fd = new FormData();
    for (const oge of fotolar) {
      if (oge.tur === "yeni") fd.append("fotograflar", oge.file);
    }
    fd.set("magazaId", magazaId);
    fd.set("kategoriId", kategoriId);
    fd.set("baslik", baslik.trim());
    fd.set("aciklama", aciklama.trim());
    fd.set("fiyat", fiyat.trim());
    fd.set("stokAdedi", stok.trim() || "1");

    setGonderiliyor(true);
    let res: Response;
    try {
      res = await fetch("/api/admin/magaza-urun-ekle", { method: "POST", body: fd });
    } catch {
      setGonderiliyor(false);
      setHata("bağlantı hatası, tekrar deneyin");
      return;
    }
    setGonderiliyor(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setHata(data.hata ?? "ürün eklenemedi");
      return;
    }
    setBasariBaslik(baslik.trim());
  }

  if (basariBaslik) {
    return (
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-green-700">
          <CheckCircle2 className="h-6 w-6" strokeWidth={2} />
          <h2 className="text-lg font-bold">Ürün eklendi!</h2>
        </div>
        <p className="mt-2 text-sm text-neutral-700">
          <span className="font-semibold">{basariBaslik}</span>, {magazaAd} mağazasına eklendi.
        </p>
        <Link
          href={`/admin/magazalar/${magazaId}/urun-ekle`}
          className="mt-4 inline-block rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-700"
        >
          Bu mağazaya bir ürün daha ekle
        </Link>
      </div>
    );
  }

  const inputClass =
    "mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500";

  return (
    <form onSubmit={gonder} className="space-y-5">
      <FotografSecici onDegisim={setFotolar} onIsleniyorDegisti={setFotoIsleniyor} />

      <div>
        <span className="text-sm font-medium text-neutral-700">Kategori</span>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {kategoriler.map((k) => {
            const renk = kategoriRengiSec(k.id);
            const secili = kategoriId === k.id;
            return (
              <button
                key={k.id}
                type="button"
                onClick={() => setKategoriId(k.id)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                  secili
                    ? `${renk.bg} ${renk.text} border-current`
                    : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                {createElement(kategoriIkonuSec(k.ad), {
                  className: `h-4 w-4 ${secili ? renk.text : "text-neutral-400"}`,
                  strokeWidth: 2,
                })}
                {k.ad}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">
          Başlık
          <input
            type="text"
            value={baslik}
            onChange={(e) => setBaslik(e.target.value)}
            required
            maxLength={200}
            placeholder="ör. Ev yapımı kayısı reçeli"
            className={inputClass}
          />
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">
          Açıklama <span className="font-normal text-neutral-400">(opsiyonel)</span>
          <textarea
            value={aciklama}
            onChange={(e) => setAciklama(e.target.value)}
            rows={3}
            className={inputClass}
          />
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">
          Fiyat (TL)
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={fiyat}
            onChange={(e) => setFiyat(e.target.value)}
            required
            inputMode="decimal"
            placeholder="0,00"
            className={inputClass}
          />
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">
          Stok Adedi
          <input
            type="number"
            step="1"
            min="1"
            value={stok}
            onChange={(e) => setStok(e.target.value)}
            required
            inputMode="numeric"
            className={inputClass}
          />
        </label>
      </div>

      {hata && <p className="text-sm text-red-600">{hata}</p>}

      <button
        type="submit"
        disabled={gonderiliyor || fotoIsleniyor}
        className="w-full rounded-md bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
      >
        {fotoIsleniyor ? "Fotoğraflar hazırlanıyor…" : gonderiliyor ? "Ekleniyor…" : "Ürünü Ekle"}
      </button>
    </form>
  );
}
