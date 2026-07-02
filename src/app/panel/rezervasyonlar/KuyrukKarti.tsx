"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Rezervasyon = {
  id: string;
  tip: "aktif" | "yedek";
  siraNo: number;
  rezervKodu: string;
  aliciAd: string;
  aliciTelefon: string | null;
};

type Urun = {
  id: string;
  baslik: string;
  durum: string;
  stokAdedi: number;
  satildiSayisi: number;
  kuyruk: Rezervasyon[];
};

const URUN_DURUM_ETIKETI: Record<string, string> = {
  sergide: "Sergide",
  doldu: "Dolu",
  satildi: "Satıldı",
};

export function KuyrukKarti({ urun }: { urun: Urun }) {
  const router = useRouter();
  const [onay, setOnay] = useState<{ rezervId: string; sonuc: "satildi" | "gelmedi" } | null>(null);
  const [bekleyenId, setBekleyenId] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  async function sonuclandir(rezervId: string, sonuc: "satildi" | "gelmedi") {
    setHata(null);
    setBekleyenId(rezervId);
    const res = await fetch("/api/panel/rezervasyon-sonuclandir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rezervId, sonuc }),
    });
    setBekleyenId(null);
    setOnay(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setHata(data.hata ?? "işlem başarısız");
      return;
    }
    router.refresh();
  }

  const aktifler = urun.kuyruk.filter((r) => r.tip === "aktif");
  const yedekler = urun.kuyruk.filter((r) => r.tip === "yedek");

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-baseline justify-between">
        <h3 className="font-semibold text-neutral-900">{urun.baslik}</h3>
        <span className="text-xs text-neutral-500">
          {URUN_DURUM_ETIKETI[urun.durum] ?? urun.durum} · stok {urun.stokAdedi}
          {urun.satildiSayisi > 0 && ` · ${urun.satildiSayisi} satıldı`}
        </span>
      </div>

      {urun.kuyruk.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-500">Bekleyen rezervasyon yok.</p>
      ) : (
        <div className="mt-3 space-y-3">
          {aktifler.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Aktif hak sahipleri
              </p>
              <ul className="mt-1 space-y-2">
                {aktifler.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-neutral-50 p-2"
                  >
                    <div className="text-sm">
                      <span className="font-semibold text-neutral-900">#{r.siraNo}</span>{" "}
                      <span className="text-neutral-700">{r.aliciAd}</span>{" "}
                      <span className="text-neutral-500">{r.aliciTelefon}</span>{" "}
                      <span className="font-mono text-xs text-neutral-400">{r.rezervKodu}</span>
                    </div>
                    {onay?.rezervId === r.id ? (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-neutral-700">
                          {onay.sonuc === "satildi" ? "Satıldı olarak işaretle?" : "Gelmedi olarak işaretle?"}
                        </span>
                        <button
                          type="button"
                          onClick={() => sonuclandir(r.id, onay.sonuc)}
                          disabled={bekleyenId === r.id}
                          className="rounded-md bg-primary-600 px-2 py-1 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
                        >
                          Evet
                        </button>
                        <button
                          type="button"
                          onClick={() => setOnay(null)}
                          className="rounded-md bg-neutral-200 px-2 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-300"
                        >
                          Vazgeç
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setOnay({ rezervId: r.id, sonuc: "satildi" })}
                          className="rounded-md bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-700"
                        >
                          Satıldı
                        </button>
                        <button
                          type="button"
                          onClick={() => setOnay({ rezervId: r.id, sonuc: "gelmedi" })}
                          className="rounded-md bg-neutral-600 px-3 py-1 text-xs font-semibold text-white hover:bg-neutral-700"
                        >
                          Gelmedi
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {yedekler.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Yedekler</p>
              <ul className="mt-1 space-y-1">
                {yedekler.map((r) => (
                  <li key={r.id} className="rounded-lg bg-neutral-50 p-2 text-sm">
                    <span className="font-semibold text-neutral-900">Y{r.siraNo}</span>{" "}
                    <span className="text-neutral-700">{r.aliciAd}</span>{" "}
                    <span className="text-neutral-500">{r.aliciTelefon}</span>{" "}
                    <span className="font-mono text-xs text-neutral-400">{r.rezervKodu}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {hata && <p className="mt-2 text-sm text-red-600">{hata}</p>}
    </div>
  );
}
