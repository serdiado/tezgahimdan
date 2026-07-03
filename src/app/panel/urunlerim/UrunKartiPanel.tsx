"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, RotateCcw, Trash2 } from "lucide-react";
import { PaylasButonlari } from "@/components/PaylasButonlari";

const DURUM_STIL: Record<string, { etiket: string; className: string }> = {
  sergide: { etiket: "Sergide", className: "bg-green-100 text-green-700" },
  doldu: { etiket: "Dolu", className: "bg-amber-100 text-amber-700" },
  satildi: { etiket: "Satıldı", className: "bg-neutral-200 text-neutral-600" },
};

const fiyatFormat = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });

export type UrunPanelVeri = {
  id: string;
  baslik: string;
  kategoriAd: string;
  fiyat: number;
  stokAdedi: number;
  durum: string;
  fotograf: string | null;
  bekleyenSayisi: number;
  silindiMi: boolean;
  magazaSlug: string;
};

export function UrunKartiPanel({ urun }: { urun: UrunPanelVeri }) {
  const router = useRouter();
  const [kaldirOnay, setKaldirOnay] = useState(false);
  const [bekliyor, setBekliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const durumStil = DURUM_STIL[urun.durum] ?? {
    etiket: urun.durum,
    className: "bg-neutral-200 text-neutral-600",
  };
  const kaldirmaEngelli = urun.bekleyenSayisi > 0;

  async function kaldir() {
    setHata(null);
    setBekliyor(true);
    const res = await fetch("/api/panel/urun-kaldir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: urun.id }),
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
    const res = await fetch("/api/panel/urun-geri-getir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: urun.id }),
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
    <div className="flex gap-3 rounded-2xl bg-white p-3 shadow-sm">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
        {urun.fotograf ? (
          <Image src={urun.fotograf} alt={urun.baslik} fill className="object-cover" sizes="80px" />
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate font-medium text-neutral-900">{urun.baslik}</h3>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${durumStil.className}`}>
            {durumStil.etiket}
          </span>
        </div>
        <p className="text-xs text-neutral-500">
          {urun.kategoriAd} · stok {urun.stokAdedi}
          {urun.bekleyenSayisi > 0 && ` · ${urun.bekleyenSayisi} bekleyen rezervasyon`}
        </p>
        <p className="text-sm font-semibold text-primary-700">{fiyatFormat.format(urun.fiyat)}</p>

        <div className="mt-1 flex flex-wrap items-center gap-2">
          {!urun.silindiMi && (
            <Link
              href={`/panel/urun-duzenle/${urun.id}`}
              className="flex items-center gap-1 rounded-md border border-neutral-300 px-2 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
              Düzenle
            </Link>
          )}

          {urun.silindiMi ? (
            <button
              type="button"
              onClick={geriGetir}
              disabled={bekliyor}
              className="flex items-center gap-1 rounded-md border border-neutral-300 px-2 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 disabled:opacity-60"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
              Geri Getir
            </button>
          ) : kaldirOnay ? (
            <span className="flex flex-wrap items-center gap-1">
              {kaldirmaEngelli ? (
                <span className="text-xs text-red-600">
                  {urun.bekleyenSayisi} bekleyen rezervasyon var, önce sonuçlandırılmalı.
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
        </div>
        {!urun.silindiMi && (
          <div className="mt-2">
            <PaylasButonlari
              baslik={urun.baslik}
              fiyat={urun.fiyat}
              urunLink={`/magaza/${urun.magazaSlug}?urun=${urun.id}`}
              kapakFotoUrl={urun.fotograf}
            />
          </div>
        )}
        {hata && <p className="text-xs text-red-600">{hata}</p>}
      </div>
    </div>
  );
}
