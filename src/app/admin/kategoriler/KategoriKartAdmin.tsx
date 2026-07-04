"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, RotateCcw, Trash2 } from "lucide-react";

export type KategoriAdminVeri = {
  id: string;
  ad: string;
  silindiMi: boolean;
  urunSayisi: number;
};

const inputClass =
  "rounded-md border border-neutral-300 px-2 py-1 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500";

export function KategoriKartAdmin({ kategori }: { kategori: KategoriAdminVeri }) {
  const router = useRouter();
  const [duzenleModu, setDuzenleModu] = useState(false);
  const [yeniAd, setYeniAd] = useState(kategori.ad);
  const [kaldirOnay, setKaldirOnay] = useState(false);
  const [bekliyor, setBekliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const kullanimda = kategori.urunSayisi > 0;

  async function yenidenAdlandir() {
    setHata(null);
    if (!yeniAd.trim()) {
      setHata("kategori adı zorunlu");
      return;
    }
    setBekliyor(true);
    const res = await fetch("/api/admin/kategori-guncelle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: kategori.id, ad: yeniAd.trim() }),
    });
    setBekliyor(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setHata(data.hata ?? "yeniden adlandırılamadı");
      return;
    }
    setDuzenleModu(false);
    router.refresh();
  }

  async function kaldir() {
    setHata(null);
    setBekliyor(true);
    const res = await fetch("/api/admin/kategori-kaldir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: kategori.id }),
    });
    setBekliyor(false);
    setKaldirOnay(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setHata(data.hata ?? "kaldırılamadı");
      return;
    }
    router.refresh();
  }

  async function geriGetir() {
    setHata(null);
    setBekliyor(true);
    const res = await fetch("/api/admin/kategori-geri-getir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: kategori.id }),
    });
    setBekliyor(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setHata(data.hata ?? "geri getirilemedi");
      return;
    }
    router.refresh();
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {duzenleModu ? (
          <span className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={yeniAd}
              onChange={(e) => setYeniAd(e.target.value)}
              maxLength={50}
              className={inputClass}
              autoFocus
            />
            <button
              type="button"
              onClick={yenidenAdlandir}
              disabled={bekliyor}
              className="rounded-md bg-primary-600 px-2 py-1 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
            >
              Kaydet
            </button>
            <button
              type="button"
              onClick={() => {
                setDuzenleModu(false);
                setYeniAd(kategori.ad);
                setHata(null);
              }}
              className="rounded-md bg-neutral-200 px-2 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-300"
            >
              Vazgeç
            </button>
          </span>
        ) : (
          <div>
            <h3 className="font-semibold text-neutral-900">{kategori.ad}</h3>
            <p className="mt-0.5 text-xs text-neutral-500">
              {kategori.urunSayisi} ürün{kategori.silindiMi && " · Kaldırılmış"}
            </p>
          </div>
        )}

        {!duzenleModu && (
          <div className="flex flex-wrap items-center gap-2">
            {kategori.silindiMi ? (
              <button
                type="button"
                onClick={geriGetir}
                disabled={bekliyor}
                className="flex items-center gap-1 rounded-md border border-neutral-300 px-2 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 disabled:opacity-60"
              >
                <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
                Geri Getir
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setDuzenleModu(true)}
                  className="flex items-center gap-1 rounded-md border border-neutral-300 px-2 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
                >
                  <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                  Yeniden Adlandır
                </button>
                {kaldirOnay ? (
                  <span className="flex flex-wrap items-center gap-1">
                    {kullanimda ? (
                      <span className="text-xs text-red-600">
                        {kategori.urunSayisi} üründe kullanılıyor, kaldırılamaz.
                      </span>
                    ) : (
                      <>
                        <span className="text-xs text-neutral-600">Kaldırılsın mı?</span>
                        <button
                          type="button"
                          onClick={kaldir}
                          disabled={bekliyor}
                          className="rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                        >
                          Evet
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => setKaldirOnay(false)}
                      className="rounded-md bg-neutral-200 px-2 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-300"
                    >
                      Vazgeç
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setKaldirOnay(true)}
                    className="flex items-center gap-1 rounded-md border border-neutral-300 px-2 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                    Kaldır
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
      {hata && <p className="mt-2 text-xs text-red-600">{hata}</p>}
    </div>
  );
}
