"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PlatformAyarlariForm({
  guvenilirlikEsigi,
  maxYedek,
  yasakSuresiGun,
}: {
  guvenilirlikEsigi: number;
  maxYedek: number;
  yasakSuresiGun: number;
}) {
  const router = useRouter();
  const [esik, setEsik] = useState(String(guvenilirlikEsigi));
  const [yedek, setYedek] = useState(String(maxYedek));
  const [yasakGun, setYasakGun] = useState(String(yasakSuresiGun));
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [basarili, setBasarili] = useState(false);

  async function gonder(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    setBasarili(false);
    setGonderiliyor(true);
    const res = await fetch("/api/admin/platform-ayarlari-guncelle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guvenilirlikEsigi: Number.parseInt(esik, 10),
        maxYedek: Number.parseInt(yedek, 10),
        yasakSuresiGun: Number.parseInt(yasakGun, 10),
      }),
    });
    setGonderiliyor(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setHata(data.hata ?? "işlem başarısız");
      return;
    }
    setBasarili(true);
    router.refresh();
  }

  const inputClass =
    "mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500";

  return (
    <form onSubmit={gonder} className="space-y-5 rounded-2xl bg-white p-5 shadow-sm">
      <div>
        <label className="block text-sm font-medium text-neutral-700">
          Güvenilirlik Eşiği
          <input
            type="number"
            min={1}
            max={20}
            step={1}
            required
            value={esik}
            onChange={(e) => setEsik(e.target.value)}
            className={inputClass}
          />
        </label>
        <p className="mt-1 text-xs text-neutral-400">
          Üst üste bu kadar rezervasyonunu teslim almayan alıcıya otomatik rezervasyon yasağı
          uygulanır (araya giren bir satın alma seriyi sıfırlar).
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">
          Yasak Süresi (gün)
          <input
            type="number"
            min={1}
            max={30}
            step={1}
            required
            value={yasakGun}
            onChange={(e) => setYasakGun(e.target.value)}
            className={inputClass}
          />
        </label>
        <p className="mt-1 text-xs text-neutral-400">
          Seri dolunca alıcının kaç gün yeni rezervasyon yapamayacağı. Yasak başlarken alıcının
          bekleyen rezervasyonları da iptal edilir; süre bitince sayaç sıfırdan başlar.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">
          Maksimum Yedek Sayısı
          <input
            type="number"
            min={0}
            max={50}
            step={1}
            required
            value={yedek}
            onChange={(e) => setYedek(e.target.value)}
            className={inputClass}
          />
        </label>
        <p className="mt-1 text-xs text-neutral-400">
          Bir ürünün stoku dolduktan sonra kuyruğa girebilecek en fazla yedek sayısı.
        </p>
      </div>

      {hata && <p className="text-sm text-red-600">{hata}</p>}
      {basarili && !hata && <p className="text-sm text-green-700">Kaydedildi.</p>}

      <button
        type="submit"
        disabled={gonderiliyor}
        className="w-full rounded-md bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
      >
        {gonderiliyor ? "Kaydediliyor…" : "Kaydet"}
      </button>
    </form>
  );
}
