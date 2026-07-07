"use client";

import { useState } from "react";

const HEDEF_ETIKETI: Record<string, string> = {
  hepsi: "Herkes (satıcı + alıcı)",
  satici: "Sadece satıcılar",
  alici: "Sadece alıcılar",
};

export function DuyuruForm() {
  const [hedefKitle, setHedefKitle] = useState<"hepsi" | "satici" | "alici">("hepsi");
  const [mesaj, setMesaj] = useState("");
  const [onay, setOnay] = useState(false);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [sonuc, setSonuc] = useState<number | null>(null);

  async function gonder(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    if (!mesaj.trim()) {
      setHata("mesaj zorunlu");
      return;
    }
    if (!onay) {
      setOnay(true);
      return;
    }

    setGonderiliyor(true);
    const res = await fetch("/api/admin/duyuru-gonder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hedefKitle, mesaj: mesaj.trim() }),
    });
    setGonderiliyor(false);
    setOnay(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setHata(data.hata ?? "gönderilemedi");
      return;
    }
    const data = await res.json();
    setSonuc(data.gonderilenSayisi);
    setMesaj("");
  }

  const inputClass =
    "mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500";

  return (
    <form onSubmit={gonder} className="space-y-5 rounded-2xl bg-white p-5 shadow-sm">
      <div>
        <label className="block text-sm font-medium text-neutral-700">
          Hedef Kitle
          <select
            value={hedefKitle}
            onChange={(e) => {
              setHedefKitle(e.target.value as "hepsi" | "satici" | "alici");
              setOnay(false);
            }}
            className={inputClass}
          >
            <option value="hepsi">Herkes (satıcı + alıcı)</option>
            <option value="satici">Sadece satıcılar</option>
            <option value="alici">Sadece alıcılar</option>
          </select>
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">
          Mesaj
          <textarea
            value={mesaj}
            onChange={(e) => {
              setMesaj(e.target.value);
              setOnay(false);
            }}
            rows={4}
            maxLength={500}
            placeholder="ör. Bu hafta pazar hava durumu nedeniyle iptal edilmiştir."
            className={inputClass}
          />
        </label>
      </div>

      {hata && <p className="text-sm text-red-600">{hata}</p>}
      {sonuc !== null && !hata && (
        <p className="text-sm text-green-700">Duyuru {sonuc} kullanıcıya gönderildi.</p>
      )}

      {onay ? (
        <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          <p>
            <span className="font-semibold">{HEDEF_ETIKETI[hedefKitle]}</span> kitlesine bu mesaj
            gönderilsin mi? Bu işlem geri alınamaz.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="submit"
              disabled={gonderiliyor}
              className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
            >
              {gonderiliyor ? "Gönderiliyor…" : "Evet, Gönder"}
            </button>
            <button
              type="button"
              onClick={() => setOnay(false)}
              className="rounded-md bg-neutral-200 px-3 py-1.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-300"
            >
              Vazgeç
            </button>
          </div>
        </div>
      ) : (
        <button
          type="submit"
          className="w-full rounded-md bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
        >
          Duyuruyu Gönder
        </button>
      )}
    </form>
  );
}
