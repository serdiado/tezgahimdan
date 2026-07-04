"use client";

import { useState } from "react";

const SEBEP_MAX = 500;

// Vitrinde hem magaza hem urun hedefli sikayet olusturma icin paylasilan modal.
// Giris kontrolu bu bilesenin DISINDA yapilir (cagiran taraf, KP-1'deki
// rezerveTikla deseniyle ayni: girissizse modal hic acilmadan /giris'e yonlenir)
// - modal sadece girisli kullaniciya gorunur.
export function SikayetModal({
  hedefTuru,
  hedefId,
  hedefAdi,
  onClose,
}: {
  hedefTuru: "magaza" | "urun";
  hedefId: string;
  hedefAdi: string;
  onClose: () => void;
}) {
  const [sebep, setSebep] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [basarili, setBasarili] = useState(false);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  async function gonder(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    if (!sebep.trim()) {
      setHata("lütfen şikayet sebebinizi yazın");
      return;
    }
    setGonderiliyor(true);
    const res = await fetch("/api/sikayet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hedefTuru, hedefId, sebep: sebep.trim() }),
    });
    setGonderiliyor(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setHata(data.hata ?? "şikayet gönderilemedi");
      return;
    }
    setBasarili(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-lg">
        {basarili ? (
          <div>
            <h2 className="text-lg font-bold text-neutral-900">Şikayetiniz alındı</h2>
            <p className="mt-2 text-sm text-neutral-600">
              Bildiriminiz için teşekkürler, ekibimiz inceleyecek.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 w-full rounded-md bg-primary-500 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-600"
            >
              Tamam
            </button>
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-bold text-neutral-900">Şikayet Et</h2>
            <p className="mt-1 text-sm text-neutral-600">{hedefAdi}</p>
            <form onSubmit={gonder} className="mt-4 flex flex-col gap-3">
              <label className="text-sm text-neutral-700">
                Sebep
                <textarea
                  value={sebep}
                  onChange={(e) => setSebep(e.target.value.slice(0, SEBEP_MAX))}
                  maxLength={SEBEP_MAX}
                  rows={4}
                  required
                  placeholder="Neyle ilgili bir sorun yaşadınız?"
                  className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
                <span className="mt-0.5 block text-right text-xs text-neutral-400">
                  {sebep.length}/{SEBEP_MAX}
                </span>
              </label>
              {hata && <p className="text-sm text-red-600">{hata}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-md bg-neutral-100 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-200"
                >
                  Kapat
                </button>
                <button
                  type="submit"
                  disabled={gonderiliyor}
                  className="flex-1 rounded-md bg-primary-500 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-60"
                >
                  {gonderiliyor ? "Gönderiliyor…" : "Gönder"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
