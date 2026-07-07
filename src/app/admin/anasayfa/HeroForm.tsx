"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function HeroForm({
  baslik: baslangicBaslik,
  aciklama: baslangicAciklama,
  ctaMetni: baslangicCtaMetni,
  ctaLink: baslangicCtaLink,
  gorselUrl,
}: {
  baslik: string;
  aciklama: string;
  ctaMetni: string;
  ctaLink: string;
  gorselUrl: string | null;
}) {
  const router = useRouter();
  const [baslik, setBaslik] = useState(baslangicBaslik);
  const [aciklama, setAciklama] = useState(baslangicAciklama);
  const [ctaMetni, setCtaMetni] = useState(baslangicCtaMetni);
  const [ctaLink, setCtaLink] = useState(baslangicCtaLink);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [fotoYukleniyor, setFotoYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [basarili, setBasarili] = useState(false);

  async function metinKaydet(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    setBasarili(false);
    setGonderiliyor(true);
    const res = await fetch("/api/admin/site-icerik-guncelle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        alanlar: {
          anasayfa_hero_baslik: baslik.trim(),
          anasayfa_hero_aciklama: aciklama.trim(),
          anasayfa_hero_cta_metni: ctaMetni.trim(),
          anasayfa_hero_cta_link: ctaLink.trim(),
        },
      }),
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

  async function fotoYukle(dosya: File) {
    setHata(null);
    setFotoYukleniyor(true);
    const fd = new FormData();
    fd.set("anahtar", "anasayfa_hero_gorsel");
    fd.set("gorsel", dosya);
    const res = await fetch("/api/admin/site-icerik-gorsel", { method: "POST", body: fd });
    setFotoYukleniyor(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setHata(data.hata ?? "fotoğraf yüklenemedi");
      return;
    }
    router.refresh();
  }

  async function fotoKaldir() {
    setHata(null);
    setFotoYukleniyor(true);
    const res = await fetch("/api/admin/site-icerik-gorsel", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anahtar: "anasayfa_hero_gorsel" }),
    });
    setFotoYukleniyor(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setHata(data.hata ?? "kaldırılamadı");
      return;
    }
    router.refresh();
  }

  const inputClass =
    "mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500";

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-neutral-900">Anasayfa Hero</h2>
      <p className="mt-1 text-xs text-neutral-500">
        Anasayfanın en üstünde görünür. Boş bırakılan alanlar gösterilmez.
      </p>

      <div className="mt-3">
        <span className="text-sm font-medium text-neutral-700">Görsel</span>
        {gorselUrl && (
          <div className="mt-1 overflow-hidden rounded-lg border border-neutral-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={gorselUrl} alt="Hero görseli" className="h-32 w-full object-cover" />
          </div>
        )}
        <div className="mt-2 flex items-center gap-2">
          <label className="cursor-pointer rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100">
            {gorselUrl ? "Değiştir" : "Yükle"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={fotoYukleniyor}
              onChange={(e) => {
                const dosya = e.target.files?.[0];
                if (dosya) fotoYukle(dosya);
              }}
            />
          </label>
          {gorselUrl && (
            <button
              type="button"
              onClick={fotoKaldir}
              disabled={fotoYukleniyor}
              className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-60"
            >
              Kaldır
            </button>
          )}
          {fotoYukleniyor && <span className="text-xs text-neutral-400">İşleniyor…</span>}
        </div>
      </div>

      <form onSubmit={metinKaydet} className="mt-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Başlık
            <input
              type="text"
              value={baslik}
              onChange={(e) => setBaslik(e.target.value)}
              maxLength={200}
              placeholder="ör. Seferihisar'ın el emeği tezgahları, artık online"
              className={inputClass}
            />
          </label>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Açıklama
            <textarea
              value={aciklama}
              onChange={(e) => setAciklama(e.target.value)}
              rows={2}
              maxLength={300}
              className={inputClass}
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium text-neutral-700">
            Buton Metni
            <input
              type="text"
              value={ctaMetni}
              onChange={(e) => setCtaMetni(e.target.value)}
              maxLength={50}
              placeholder="ör. Tezgahları Gör"
              className={inputClass}
            />
          </label>
          <label className="block text-sm font-medium text-neutral-700">
            Buton Linki
            <input
              type="text"
              value={ctaLink}
              onChange={(e) => setCtaLink(e.target.value)}
              maxLength={200}
              placeholder="#magazalar"
              className={inputClass}
            />
          </label>
        </div>

        {hata && <p className="text-sm text-red-600">{hata}</p>}
        {basarili && !hata && <p className="text-sm text-green-700">Kaydedildi.</p>}

        <button
          type="submit"
          disabled={gonderiliyor}
          className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
        >
          {gonderiliyor ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </form>
    </div>
  );
}
