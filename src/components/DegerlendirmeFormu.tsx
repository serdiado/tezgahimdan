"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";

const YORUM_MAX = 500;

// SikayetModal.tsx ile ayni desen (form-modal + POST + basari ekrani). Giris
// kontrolu gerekmez - bu modal zaten /rezervasyonum sayfasinda SADECE
// durum==="satildi" (yani zaten girisli VE satin almis) rezervasyonun yaninda
// render edilir. Kullanici puanini/yorumunu SONRADAN guncelleyebilir - upsert,
// mevcutPuan/mevcutYorum doluysa form onceden doldurulur (duzenleme modu).
export function DegerlendirmeFormu({
  urunId,
  urunBaslik,
  mevcutPuan,
  mevcutYorum,
  onClose,
}: {
  urunId: string;
  urunBaslik: string;
  mevcutPuan?: number | null;
  mevcutYorum?: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [puan, setPuan] = useState(mevcutPuan ?? 0);
  const [hoverPuan, setHoverPuan] = useState(0);
  const [yorum, setYorum] = useState(mevcutYorum ?? "");
  const [hata, setHata] = useState<string | null>(null);
  const [basarili, setBasarili] = useState(false);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  async function gonder(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    if (puan < 1) {
      setHata("lütfen bir puan seçin");
      return;
    }
    setGonderiliyor(true);
    const res = await fetch("/api/degerlendirme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urunId, puan, yorum: yorum.trim() }),
    });
    setGonderiliyor(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setHata(data.hata ?? "değerlendirme gönderilemedi");
      return;
    }
    setBasarili(true);
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
        {basarili ? (
          <div>
            <h2 className="text-lg font-bold text-neutral-900">Değerlendirmeniz kaydedildi</h2>
            <p className="mt-2 text-sm text-neutral-600">
              Görüşünüz için teşekkürler, diğer alıcılara yardımcı olacak.
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
            <h2 className="text-lg font-bold text-neutral-900">Değerlendir</h2>
            <p className="mt-1 text-sm text-neutral-600">{urunBaslik}</p>
            <form onSubmit={gonder} className="mt-4 flex flex-col gap-3">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPuan(i)}
                    onMouseEnter={() => setHoverPuan(i)}
                    onMouseLeave={() => setHoverPuan(0)}
                    aria-label={`${i} yıldız`}
                    className="p-0.5"
                  >
                    <Star
                      className={`h-7 w-7 ${
                        i <= (hoverPuan || puan) ? "fill-amber-400 text-amber-400" : "text-neutral-300"
                      }`}
                      strokeWidth={1.5}
                    />
                  </button>
                ))}
              </div>
              <label className="text-sm text-neutral-700">
                Yorum (opsiyonel)
                <textarea
                  value={yorum}
                  onChange={(e) => setYorum(e.target.value.slice(0, YORUM_MAX))}
                  maxLength={YORUM_MAX}
                  rows={4}
                  placeholder="Ürünle ilgili deneyiminizi paylaşın"
                  className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
                <span className="mt-0.5 block text-right text-xs text-neutral-400">
                  {yorum.length}/{YORUM_MAX}
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
