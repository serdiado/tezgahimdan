"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Guvenilirlik = { satildi: number; gelmedi: number; kisitliMi: boolean };

type Rezervasyon = {
  id: string;
  tip: "aktif" | "yedek";
  siraNo: number;
  rezervKodu: string;
  aliciAd: string;
  aliciTelefon: string | null;
  guvenilirlik: Guvenilirlik;
};

type SonuclananRezervasyon = {
  id: string;
  durum: string;
  rezervKodu: string;
  aliciAd: string;
  aliciTelefon: string | null;
  guvenilirlik: Guvenilirlik;
};

type Urun = {
  id: string;
  baslik: string;
  durum: string;
  stokAdedi: number;
  satildiSayisi: number;
  kuyruk: Rezervasyon[];
  sonuclananlar: SonuclananRezervasyon[];
};

const URUN_DURUM_ETIKETI: Record<string, string> = {
  sergide: "Sergide",
  doldu: "Dolu",
  satildi: "Satıldı",
};

// Sonuclanan rezervasyon durumlari icin etiket + renk.
const SONUC_STIL: Record<string, { etiket: string; className: string }> = {
  satildi: { etiket: "Satıldı", className: "bg-green-100 text-green-700" },
  gelmedi: { etiket: "Gelmedi", className: "bg-amber-100 text-amber-700" },
  iptal: { etiket: "İptal", className: "bg-neutral-200 text-neutral-600" },
};

// PLAN.md SS3: "Saticiya rezervasyonda alicinin orani gosterilir". Toplam
// sonuc (satildi+gelmedi) sifirsa hic gecmisi yok demektir, rozet gosterilmez -
// ilk kez gelen her aliciya "yeni" etiketi yapistirmak gereksiz gurultu olur.
// Istisna: kisitliMi (su an aktif gelmedi yasagi) doluysa rozet HER ZAMAN
// cikar - yasak baslarken sayac sifirlandigi icin gelmedi=0 gorunebilir,
// "Kisitli" cipi sayilardan bagimsiz gosterilmeli (2026-07-10).
function GuvenilirlikRozeti({ guvenilirlik }: { guvenilirlik: Guvenilirlik }) {
  const toplam = guvenilirlik.satildi + guvenilirlik.gelmedi;
  if (toplam === 0 && !guvenilirlik.kisitliMi) return null;
  return (
    <span className="inline-flex items-center gap-1">
      {toplam > 0 && (
        <span className="text-xs text-neutral-400">
          {guvenilirlik.satildi}/{toplam} aldı
        </span>
      )}
      {guvenilirlik.kisitliMi && (
        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-700">
          Kısıtlı
        </span>
      )}
    </span>
  );
}

export function KuyrukKarti({ urun }: { urun: Urun }) {
  const router = useRouter();
  const [onay, setOnay] = useState<{ rezervId: string; sonuc: "satildi" | "gelmedi" } | null>(null);
  const [bekleyenId, setBekleyenId] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [geriAlOnay, setGeriAlOnay] = useState<string | null>(null);
  const [geriAlBekleyen, setGeriAlBekleyen] = useState<string | null>(null);

  async function geriAl(rezervId: string) {
    setHata(null);
    setGeriAlBekleyen(rezervId);
    const res = await fetch("/api/panel/rezervasyon-geri-al", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rezervId }),
    });
    setGeriAlBekleyen(null);
    setGeriAlOnay(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setHata(data.hata ?? "geri alınamadı");
      return;
    }
    router.refresh();
  }

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
                      <span className="font-mono text-xs text-neutral-400">{r.rezervKodu}</span>{" "}
                      <GuvenilirlikRozeti guvenilirlik={r.guvenilirlik} />
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
                    <span className="font-mono text-xs text-neutral-400">{r.rezervKodu}</span>{" "}
                    <GuvenilirlikRozeti guvenilirlik={r.guvenilirlik} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Sonuclananlar: "hicbir kayit silinmez" ilkesi geregi ekranda kalir.
          Bu bolumde Satildi/Gelmedi butonu YOK (kayit zaten sonuclandi). */}
      {urun.sonuclananlar.length > 0 && (
        <div className="mt-4 border-t border-neutral-100 pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Sonuçlananlar</p>
          <ul className="mt-1 space-y-1">
            {urun.sonuclananlar.map((r) => {
              const stil = SONUC_STIL[r.durum] ?? {
                etiket: r.durum,
                className: "bg-neutral-200 text-neutral-600",
              };
              const geriAlinabilir = r.durum === "satildi" || r.durum === "gelmedi";
              return (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg bg-neutral-50 p-2 text-sm"
                >
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${stil.className}`}>
                    {stil.etiket}
                  </span>
                  <span className="text-neutral-700">{r.aliciAd}</span>
                  <span className="text-neutral-500">{r.aliciTelefon}</span>
                  <span className="font-mono text-xs text-neutral-400">{r.rezervKodu}</span>
                  <GuvenilirlikRozeti guvenilirlik={r.guvenilirlik} />
                  {geriAlinabilir &&
                    (geriAlOnay === r.id ? (
                      <span className="ml-auto flex items-center gap-1">
                        <span className="text-xs text-neutral-600">Geri alınsın mı?</span>
                        <button
                          type="button"
                          onClick={() => geriAl(r.id)}
                          disabled={geriAlBekleyen === r.id}
                          className="rounded-md bg-primary-600 px-2 py-1 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
                        >
                          Evet
                        </button>
                        <button
                          type="button"
                          onClick={() => setGeriAlOnay(null)}
                          className="rounded-md bg-neutral-200 px-2 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-300"
                        >
                          Hayır
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setGeriAlOnay(r.id)}
                        className="ml-auto rounded-md border border-neutral-300 px-2 py-1 text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
                      >
                        Geri Al
                      </button>
                    ))}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {hata && <p className="mt-2 text-sm text-red-600">{hata}</p>}
    </div>
  );
}
