"use client";

import { useState } from "react";

type RezervasyonBilgisi = {
  rezervKodu: string;
  tip: "aktif" | "yedek";
  siraNo: number;
  durum: string;
  urunBaslik: string;
  magazaAd: string;
};

const DURUM_ETIKETI: Record<string, string> = {
  bekliyor: "Bekliyor",
  satildi: "Satıldı",
  gelmedi: "Gelmedi",
  iptal: "İptal edildi",
};

function siraMesaji(tip: "aktif" | "yedek", siraNo: number): string {
  return tip === "aktif" ? `${siraNo}. sırada (aktif hak sahibi)` : `${siraNo}. sıra yedekte`;
}

export function RezervasyonumIcerik() {
  const [rez, setRez] = useState<RezervasyonBilgisi | null>(null);
  const [onayIstendi, setOnayIstendi] = useState(false);
  const [iptalEdildi, setIptalEdildi] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, setBekliyor] = useState(false);
  const [kimlik, setKimlik] = useState<{ rezervKodu: string; telefon: string } | null>(null);

  async function sorgula(formData: FormData) {
    setHata(null);
    setBekliyor(true);
    const govde = {
      rezervKodu: formData.get("rezervKodu"),
      telefon: formData.get("telefon"),
    };
    const res = await fetch("/api/rezervasyon/sorgula", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(govde),
    });
    setBekliyor(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setHata(data.hata ?? "sorgulama basarisiz");
      return;
    }
    setKimlik({ rezervKodu: String(govde.rezervKodu), telefon: String(govde.telefon) });
    setRez(data);
  }

  async function vazgec() {
    if (!kimlik) return;
    setHata(null);
    setBekliyor(true);
    const res = await fetch("/api/rezervasyon/vazgec", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(kimlik),
    });
    setBekliyor(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setHata(data.hata ?? "vazgecme basarisiz");
      setOnayIstendi(false);
      return;
    }
    setIptalEdildi(true);
  }

  if (iptalEdildi) {
    return (
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-neutral-900">Rezervasyonunuz iptal edildi</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Sıranız boşaldı; varsa sıradaki yedek otomatik olarak aktif hak sahibi oldu.
        </p>
      </div>
    );
  }

  if (rez) {
    return (
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-neutral-900">{rez.urunBaslik}</h2>
        <p className="text-sm text-neutral-500">{rez.magazaAd}</p>
        <dl className="mt-4 space-y-1 text-sm text-neutral-700">
          <div>
            <dt className="inline font-semibold">Kod: </dt>
            <dd className="inline font-mono">{rez.rezervKodu}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">Sıra: </dt>
            <dd className="inline">{siraMesaji(rez.tip, rez.siraNo)}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">Durum: </dt>
            <dd className="inline">{DURUM_ETIKETI[rez.durum] ?? rez.durum}</dd>
          </div>
        </dl>
        {hata && <p className="mt-3 text-sm text-red-600">{hata}</p>}
        {rez.durum === "bekliyor" &&
          (onayIstendi ? (
            <div className="mt-4">
              <p className="text-sm font-semibold text-neutral-900">
                Emin misiniz? Sıranız kaybolur ve geri alınamaz.
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setOnayIstendi(false)}
                  className="flex-1 rounded-md bg-neutral-100 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-200"
                >
                  Hayır, kalsın
                </button>
                <button
                  type="button"
                  onClick={vazgec}
                  disabled={bekliyor}
                  className="flex-1 rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  Evet, vazgeç
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setOnayIstendi(true)}
              className="mt-4 w-full rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Vazgeç
            </button>
          ))}
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-neutral-900">Rezervasyonumu bul</h2>
      <p className="mt-1 text-sm text-neutral-600">
        Rezervasyon yaparken aldığınız kodu ve telefon numaranızı girin.
      </p>
      <form action={sorgula} className="mt-4 flex flex-col gap-3">
        <label className="text-sm text-neutral-700">
          Rezerv kodu
          <input
            name="rezervKodu"
            type="text"
            required
            placeholder="TZ-XXXXXX"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 font-mono uppercase"
          />
        </label>
        <label className="text-sm text-neutral-700">
          Telefon
          <input
            name="telefon"
            type="tel"
            required
            placeholder="05XX XXX XX XX"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </label>
        {hata && <p className="text-sm text-red-600">{hata}</p>}
        <button
          type="submit"
          disabled={bekliyor}
          className="rounded-md bg-primary-500 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-60"
        >
          Sorgula
        </button>
      </form>
    </div>
  );
}
