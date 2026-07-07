"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";

const DURUM_STIL: Record<string, { etiket: string; className: string }> = {
  bekliyor: { etiket: "Bekliyor", className: "bg-amber-100 text-amber-700" },
  inceleniyor: { etiket: "İnceleniyor", className: "bg-blue-100 text-blue-700" },
  cozuldu: { etiket: "Çözüldü", className: "bg-green-100 text-green-700" },
  reddedildi: { etiket: "Reddedildi", className: "bg-neutral-200 text-neutral-600" },
};

const tarihFormat = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric" });

export type SikayetAdminVeri = {
  id: string;
  sikayetciAd: string;
  hedefTuruEtiketi: string;
  hedefAdi: string;
  hedefLink: string | null;
  sebep: string;
  durum: string;
  yanit: string | null;
  olusturulmaTarihi: string;
};

export function SikayetKartAdmin({ sikayet }: { sikayet: SikayetAdminVeri }) {
  const router = useRouter();
  const [bekliyor, setBekliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [yanitDuzenleniyor, setYanitDuzenleniyor] = useState(false);
  const [yanitTaslak, setYanitTaslak] = useState(sikayet.yanit ?? "");

  const stil = DURUM_STIL[sikayet.durum] ?? { etiket: sikayet.durum, className: "bg-neutral-200 text-neutral-600" };

  async function durumDegistir(yeniDurum: string) {
    setHata(null);
    setBekliyor(true);
    const res = await fetch("/api/admin/sikayet-durum", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: sikayet.id, durum: yeniDurum }),
    });
    setBekliyor(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setHata(data.hata ?? "işlem başarısız");
      return;
    }
    router.refresh();
  }

  async function yanitKaydet() {
    setHata(null);
    setBekliyor(true);
    const res = await fetch("/api/admin/sikayet-yanitla", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: sikayet.id, yanit: yanitTaslak }),
    });
    setBekliyor(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setHata(data.hata ?? "işlem başarısız");
      return;
    }
    setYanitDuzenleniyor(false);
    router.refresh();
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-neutral-400">{sikayet.hedefTuruEtiketi}</span>
            {sikayet.hedefLink ? (
              <Link href={sikayet.hedefLink} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary-600 hover:underline">
                {sikayet.hedefAdi}
              </Link>
            ) : (
              <span className="font-semibold text-neutral-900">{sikayet.hedefAdi}</span>
            )}
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${stil.className}`}>
              {stil.etiket}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-neutral-500">
            {sikayet.sikayetciAd} · {tarihFormat.format(new Date(sikayet.olusturulmaTarihi))}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-700">{sikayet.sebep}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {sikayet.durum === "bekliyor" && (
          <button
            type="button"
            onClick={() => durumDegistir("inceleniyor")}
            disabled={bekliyor}
            className="rounded-md border border-neutral-300 px-2 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 disabled:opacity-60"
          >
            İncelemeye Al
          </button>
        )}
        {sikayet.durum === "inceleniyor" && (
          <>
            <button
              type="button"
              onClick={() => durumDegistir("cozuldu")}
              disabled={bekliyor}
              className="rounded-md bg-green-600 px-2 py-1 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60"
            >
              Çözüldü
            </button>
            <button
              type="button"
              onClick={() => durumDegistir("reddedildi")}
              disabled={bekliyor}
              className="rounded-md bg-neutral-600 px-2 py-1 text-xs font-semibold text-white hover:bg-neutral-700 disabled:opacity-60"
            >
              Reddet
            </button>
          </>
        )}
      </div>

      <div className="mt-3 border-t border-neutral-100 pt-2">
        {yanitDuzenleniyor ? (
          <>
            <textarea
              value={yanitTaslak}
              onChange={(e) => setYanitTaslak(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Şikayetçiye görünecek kısa bir yanıt yazın"
              className="w-full rounded-lg border border-neutral-300 px-2 py-1 text-xs focus:border-primary-500 focus:outline-none"
            />
            <div className="mt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={yanitKaydet}
                disabled={bekliyor}
                className="rounded-md bg-primary-500 px-2 py-1 text-xs font-semibold text-white hover:bg-primary-600 disabled:opacity-60"
              >
                Kaydet
              </button>
              <button
                type="button"
                onClick={() => {
                  setYanitTaslak(sikayet.yanit ?? "");
                  setYanitDuzenleniyor(false);
                }}
                className="rounded-md bg-neutral-200 px-2 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-300"
              >
                Vazgeç
              </button>
            </div>
          </>
        ) : (
          <>
            {sikayet.yanit && (
              <p className="rounded-lg bg-neutral-50 px-2 py-1 text-xs text-neutral-600">
                <span className="font-semibold text-neutral-700">Yanıtınız: </span>
                {sikayet.yanit}
              </p>
            )}
            <button
              type="button"
              onClick={() => setYanitDuzenleniyor(true)}
              className="mt-1 flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline"
            >
              <Pencil className="h-3 w-3" strokeWidth={2} />
              {sikayet.yanit ? "Yanıtı düzenle" : "Yanıtla"}
            </button>
          </>
        )}
      </div>
      {hata && <p className="mt-2 text-xs text-red-600">{hata}</p>}
    </div>
  );
}
