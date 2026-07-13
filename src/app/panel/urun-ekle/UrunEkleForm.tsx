"use client";

import { createElement, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { FotografSecici, type FotoOge } from "@/components/FotografSecici";
import { PaylasButonlari } from "@/components/PaylasButonlari";
import { kategoriIkonuSec, kategoriRengiSec } from "@/lib/kategori-renkleri";
import { taslakOku, taslakTemizle, useTaslakYaz } from "@/lib/taslak";

const TASLAK_ANAHTAR = "taslak:urun-ekle";

type Taslak = {
  baslik?: string;
  aciklama?: string;
  fiyat?: string;
  stok?: string;
  kategoriId?: string;
};

type Basari = { baslik: string; fiyat: number; urunLink: string; kapakFotoUrl: string | null };

export function UrunEkleForm({
  kategoriler,
  magazaSlug,
  ilkUrunMu = false,
}: {
  kategoriler: { id: string; ad: string }[];
  magazaSlug: string;
  // Tezgahin ILK urunu mu (2026-07-13)? Basari ekrani "Tezgahin yayinda!"
  // kutlamasina donusur + tezgah sayfasi linki one cikar. Ayni oturumda
  // ikinci urune gecilince (yeniUrun) sifirlanir - prop degil state uzerinden.
  ilkUrunMu?: boolean;
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
  const [basari, setBasari] = useState<Basari | null>(null);
  const [ilkUrun, setIlkUrun] = useState(ilkUrunMu);
  const [formAnahtar, setFormAnahtar] = useState(0); // FotografSecici'yi sifirlamak icin

  // Taslagi mount'ta oku - SSR/hydration uyumsuzlugu olmasin diye render'da degil
  // effect'te (localStorage yalniz istemcide). "Kalici state'i disaridan yukle"
  // mesru bir setState-in-effect kullanimidir; load, autosave'in 500ms debounce'undan
  // once kostugu icin taslagi bos degerle ezmez.
  useEffect(() => {
    const t = taslakOku<Taslak>(TASLAK_ANAHTAR);
    if (!t) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setBaslik(t.baslik ?? "");
    setAciklama(t.aciklama ?? "");
    setFiyat(t.fiyat ?? "");
    setStok(t.stok ?? "1");
    setKategoriId(t.kategoriId ?? "");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Metin alanlarini debounce ile taslaga yaz (basari ekranindayken durdur).
  useTaslakYaz(TASLAK_ANAHTAR, { baslik, aciklama, fiyat, stok, kategoriId }, !basari);

  async function gonder(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    if (fotolar.length < 1) {
      setHata("En az 1 fotoğraf ekleyin");
      return;
    }
    if (!kategoriId) {
      setHata("Kategori seçin");
      return;
    }

    const fd = new FormData();
    for (const oge of fotolar) {
      if (oge.tur === "yeni") fd.append("fotograflar", oge.file);
    }
    fd.set("kategoriId", kategoriId);
    fd.set("baslik", baslik.trim());
    fd.set("aciklama", aciklama.trim());
    fd.set("fiyat", fiyat.trim());
    fd.set("stokAdedi", stok.trim() || "1");

    setGonderiliyor(true);
    let res: Response;
    try {
      res = await fetch("/api/panel/urun-ekle", { method: "POST", body: fd });
    } catch {
      setGonderiliyor(false);
      setHata("Bağlantı hatası, tekrar deneyin");
      return;
    }
    setGonderiliyor(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setHata(data.hata ?? "Ürün eklenemedi");
      return;
    }
    const data = await res.json();
    const urunLink = `/magaza/${magazaSlug}?urun=${data.id}`;
    setBasari({
      baslik: baslik.trim(),
      fiyat: Number(fiyat),
      urunLink,
      kapakFotoUrl: data.fotograflar?.[0] ?? null,
    });
    taslakTemizle(TASLAK_ANAHTAR);
  }

  function yeniUrun() {
    setBasari(null);
    setIlkUrun(false);
    setBaslik("");
    setAciklama("");
    setFiyat("");
    setStok("1");
    setKategoriId("");
    setFotolar([]);
    setHata(null);
    setFormAnahtar((n) => n + 1); // FotografSecici'yi taze mount et
  }

  if (basari) {
    return (
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-green-700">
          <CheckCircle2 className="h-6 w-6" strokeWidth={2} />
          <h2 className="text-lg font-bold">{ilkUrun ? "Tezgahın yayında!" : "Ürün eklendi!"}</h2>
        </div>
        {ilkUrun && (
          <p className="mt-2 text-sm text-neutral-600">
            İlk ürününü ekledin — tezgahın artık vitrinde, alıcılar rezervasyon yapabilir.{" "}
            <Link href={`/magaza/${magazaSlug}`} className="font-semibold text-primary-600 hover:underline">
              Tezgahını gör →
            </Link>
          </p>
        )}
        <div className="mt-3 flex items-center gap-3">
          {basari.kapakFotoUrl && (
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
              <Image src={basari.kapakFotoUrl} alt="" fill className="object-cover" sizes="64px" />
            </div>
          )}
          <p className="text-sm text-neutral-700">{basari.baslik}</p>
        </div>
        <p className="mt-4 text-sm font-medium text-neutral-700">Ürününü paylaş:</p>
        <div className="mt-2">
          <PaylasButonlari
            baslik={basari.baslik}
            fiyat={basari.fiyat}
            urunLink={basari.urunLink}
            kapakFotoUrl={basari.kapakFotoUrl}
          />
        </div>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={yeniUrun}
            className="flex-1 rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-700"
          >
            Yeni ürün ekle
          </button>
          <Link
            href="/panel/urunlerim"
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-center text-sm font-semibold text-neutral-700 hover:bg-neutral-100"
          >
            Ürünlerim
          </Link>
        </div>
      </div>
    );
  }

  const inputClass =
    "mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500";

  return (
    <form onSubmit={gonder} className="space-y-5">
      <FotografSecici
        key={formAnahtar}
        onDegisim={setFotolar}
        onIsleniyorDegisti={setFotoIsleniyor}
      />

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
            name="baslik"
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
            name="aciklama"
            value={aciklama}
            onChange={(e) => setAciklama(e.target.value)}
            rows={3}
            placeholder="ör. Şekeri az, ev kaynatması. 500 gramlık cam kavanozda."
            className={inputClass}
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
            name="stokAdedi"
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
        <p className="mt-1 text-xs text-neutral-400">Genelde 1; reçel gibi çoklu üründe artırın.</p>
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
