"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DegerlendirmeFormu } from "@/components/DegerlendirmeFormu";
import { MagazaDegerlendirmeFormu } from "@/components/MagazaDegerlendirmeFormu";
import { siraMesaji } from "@/lib/rezervasyon-metin";

type Rezervasyon = {
  id: string;
  rezervKodu: string;
  tip: "aktif" | "yedek";
  siraNo: number;
  durum: string;
  urunId: string;
  urunBaslik: string;
  magazaId: string;
  magazaAd: string;
  magazaSlug: string;
  mevcutPuan: number | null;
  mevcutYorum: string | null;
  magazaMevcutPuan: number | null;
  magazaMevcutYorum: string | null;
};

const DURUM_STIL: Record<string, { etiket: string; className: string }> = {
  bekliyor: { etiket: "Bekliyor", className: "bg-primary-100 text-primary-700" },
  satildi: { etiket: "Satıldı", className: "bg-green-100 text-green-700" },
  gelmedi: { etiket: "Gelmedi", className: "bg-amber-100 text-amber-700" },
  iptal: { etiket: "İptal edildi", className: "bg-neutral-200 text-neutral-600" },
};

// 2026-07-09 duzeltmesi: magaza-bazli degerlendirme butonu geri eklendi (bkz.
// page.tsx yorumu) - urun-bazli "Degerlendir" butonunun YANINDA, ayni magazadan
// birden fazla urun alinmis olsa bile magaza basina TEK kez gosterilir
// (magazaButonuGosterilecekRezervId ile ilk-gorulen rezervasyona atanir).
export function RezervasyonumIcerik({ rezervasyonlar }: { rezervasyonlar: Rezervasyon[] }) {
  const router = useRouter();
  const [onayId, setOnayId] = useState<string | null>(null);
  const [bekleyenId, setBekleyenId] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [degerlendirilenRezervId, setDegerlendirilenRezervId] = useState<string | null>(null);
  const [degerlendirilenMagazaId, setDegerlendirilenMagazaId] = useState<string | null>(null);

  // Magaza basina TEK buton: her magazaId icin, "satildi" durumundaki ILK
  // rezervasyonun id'sini tutar - render sirasinda sadece o rezervasyon
  // karti magaza degerlendirme butonunu gosterir.
  const magazaButonuGosterilecekRezervId = useMemo(() => {
    const harita = new Map<string, string>();
    for (const r of rezervasyonlar) {
      if (r.durum === "satildi" && !harita.has(r.magazaId)) harita.set(r.magazaId, r.id);
    }
    return harita;
  }, [rezervasyonlar]);
  const degerlendirilenMagaza = rezervasyonlar.find((r) => r.magazaId === degerlendirilenMagazaId);

  async function vazgec(rezervId: string) {
    setHata(null);
    setBekleyenId(rezervId);
    const res = await fetch("/api/rezervasyon/vazgec", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rezervId }),
    });
    setBekleyenId(null);
    setOnayId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setHata(data.hata ?? "vazgeçilemedi");
      return;
    }
    router.refresh();
  }

  if (rezervasyonlar.length === 0) {
    return (
      <p className="mt-4 text-neutral-600">
        Henüz rezervasyonunuz yok. Tezgahları gezip beğendiğiniz ürünü rezerve edebilirsiniz.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {hata && <p className="text-sm text-red-600">{hata}</p>}
      {rezervasyonlar.map((r) => {
        const stil = DURUM_STIL[r.durum] ?? {
          etiket: r.durum,
          className: "bg-neutral-200 text-neutral-600",
        };
        return (
          <div key={r.id} className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate font-semibold text-neutral-900">{r.urunBaslik}</h3>
                <Link
                  href={`/magaza/${r.magazaSlug}`}
                  className="text-sm text-primary-600 hover:underline"
                >
                  {r.magazaAd}
                </Link>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${stil.className}`}>
                {stil.etiket}
              </span>
            </div>

            {r.durum === "bekliyor" && (
              <p className="mt-1 text-sm text-neutral-600">{siraMesaji(r.tip, r.siraNo)}</p>
            )}

            <p className="mt-2 text-xs text-neutral-500">
              Rezerv kodu:{" "}
              <span className="font-mono font-semibold text-neutral-700">{r.rezervKodu}</span>
              <span className="ml-1 text-neutral-400">(satıcıyla iletişimde referans için)</span>
            </p>

            {r.durum === "bekliyor" &&
              (onayId === r.id ? (
                <div className="mt-3">
                  <p className="text-sm font-semibold text-neutral-900">
                    Emin misiniz? Sıranız kaybolur ve geri alınamaz.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setOnayId(null)}
                      className="flex-1 rounded-md bg-neutral-100 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-200"
                    >
                      Hayır, kalsın
                    </button>
                    <button
                      type="button"
                      onClick={() => vazgec(r.id)}
                      disabled={bekleyenId === r.id}
                      className="flex-1 rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      Evet, vazgeç
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setOnayId(r.id)}
                  className="mt-3 w-full rounded-md border border-red-300 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  Vazgeç
                </button>
              ))}

            {r.durum === "satildi" && (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setDegerlendirilenRezervId(r.id)}
                  className="flex-1 rounded-md border border-primary-300 px-3 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-50"
                >
                  {r.mevcutPuan ? "Ürünü Düzenle" : "Ürünü Değerlendir"}
                </button>
                {magazaButonuGosterilecekRezervId.get(r.magazaId) === r.id && (
                  <button
                    type="button"
                    onClick={() => setDegerlendirilenMagazaId(r.magazaId)}
                    className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                  >
                    {r.magazaMevcutPuan ? "Tezgahı Düzenle" : "Tezgahı Değerlendir"}
                  </button>
                )}
              </div>
            )}

            {degerlendirilenRezervId === r.id && (
              <DegerlendirmeFormu
                urunId={r.urunId}
                urunBaslik={r.urunBaslik}
                mevcutPuan={r.mevcutPuan}
                mevcutYorum={r.mevcutYorum}
                onClose={() => setDegerlendirilenRezervId(null)}
              />
            )}
          </div>
        );
      })}

      {degerlendirilenMagaza && (
        <MagazaDegerlendirmeFormu
          magazaId={degerlendirilenMagaza.magazaId}
          magazaAd={degerlendirilenMagaza.magazaAd}
          mevcutPuan={degerlendirilenMagaza.magazaMevcutPuan}
          mevcutYorum={degerlendirilenMagaza.magazaMevcutYorum}
          onClose={() => setDegerlendirilenMagazaId(null)}
        />
      )}
    </div>
  );
}
