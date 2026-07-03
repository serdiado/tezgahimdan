"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Sonuc =
  | { tur: "basari"; tip: "aktif" | "yedek"; siraNo: number; rezervKodu: string }
  | { tur: "zaten"; tip: "aktif" | "yedek"; siraNo: number; rezervKodu: string };

function siraMesaji(tip: "aktif" | "yedek", siraNo: number): string {
  return tip === "aktif"
    ? `${siraNo}. sıradasınız (aktif hak sahibi).`
    : `${siraNo}. sıra yedektesiniz.`;
}

// KP-1: modal yalniz girisli kullaniciya acilir (UrunKarti kapiyi tutar). Isim/
// telefon formu YOK - kimlik oturumdan gelir. Yalnizca kullanicinin kayitli
// telefonu yoksa (kullaniciTelefonVar=false) bir kerelik telefon istenir.
export function RezerveModal({
  urunId,
  urunBaslik,
  kullaniciTelefonVar,
  onClose,
}: {
  urunId: string;
  urunBaslik: string;
  kullaniciTelefonVar: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [hata, setHata] = useState<string | null>(null);
  const [sonuc, setSonuc] = useState<Sonuc | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [telefonIste, setTelefonIste] = useState(!kullaniciTelefonVar);
  const [telefon, setTelefon] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    if (telefonIste && !telefon.trim()) {
      setHata("telefon numarası gerekli");
      return;
    }
    setGonderiliyor(true);
    let res: Response;
    try {
      res = await fetch("/api/rezervasyon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urunId, telefon: telefonIste ? telefon.trim() : undefined }),
      });
    } catch {
      setGonderiliyor(false);
      setHata("bağlantı hatası, tekrar deneyin");
      return;
    }
    setGonderiliyor(false);

    const data = await res.json().catch(() => ({}));
    if (res.status === 201) {
      setSonuc({ tur: "basari", tip: data.tip, siraNo: data.siraNo, rezervKodu: data.rezervKodu });
    } else if (res.status === 409 && data.rezervKodu) {
      setSonuc({ tur: "zaten", tip: data.tip, siraNo: data.siraNo, rezervKodu: data.rezervKodu });
    } else {
      // Sunucu telefon gerektiginde (or. hesapta numara yok / gecersiz / cakisma)
      // alani ac ki kullanici girebilsin.
      if (data.telefonGerekli) setTelefonIste(true);
      setHata(data.hata ?? "rezervasyon yapılamadı");
    }
  }

  function kapat() {
    onClose();
    // Kapasite/doluluk durumu degismis olabilir - sunucu tarafini tazele (bu ayni
    // zamanda kullaniciTelefonVar'i da guncelleyip ikinci rezervasyonda telefon
    // sorulmamasini saglar).
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-lg">
        {sonuc ? (
          <div>
            <h2 className="text-lg font-bold text-neutral-900">
              {sonuc.tur === "basari" ? "Rezervasyon alındı!" : "Zaten rezervasyonunuz var"}
            </h2>
            <p className="mt-2 text-neutral-700">{siraMesaji(sonuc.tip, sonuc.siraNo)}</p>
            <p className="mt-4 text-sm text-neutral-500">Rezerv kodunuz:</p>
            <p className="mt-1 rounded-lg bg-primary-50 px-4 py-3 text-center font-mono text-xl font-bold tracking-wider text-primary-700">
              {sonuc.rezervKodu}
            </p>
            <p className="mt-2 text-xs text-neutral-500">Pazarda ürünü alırken bu kodu söyleyin.</p>
            <p className="mt-2 text-xs text-neutral-500">
              Rezervasyonlarınızı{" "}
              <Link href="/rezervasyonum" className="font-semibold text-primary-600 underline">
                Rezervasyonlarım
              </Link>{" "}
              sayfasından görüntüleyip yönetebilirsiniz.
            </p>
            <button
              type="button"
              onClick={kapat}
              className="mt-4 w-full rounded-md bg-primary-500 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-600"
            >
              Tamam
            </button>
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-bold text-neutral-900">Rezerve Et</h2>
            <p className="mt-1 text-sm text-neutral-600">{urunBaslik}</p>
            <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
              {telefonIste && (
                <label className="text-sm text-neutral-700">
                  Telefon
                  <input
                    name="telefon"
                    type="tel"
                    value={telefon}
                    onChange={(e) => setTelefon(e.target.value)}
                    required
                    placeholder="05XX XXX XX XX"
                    className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
                  />
                  <span className="mt-1 block text-xs text-neutral-400">
                    Satıcının sana ulaşabilmesi için bir kez sorulur, sonra tekrar istenmez.
                  </span>
                </label>
              )}
              {!telefonIste && (
                <p className="text-sm text-neutral-600">
                  Bu ürünü rezerve etmek üzeresiniz. Onaylıyor musunuz?
                </p>
              )}
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
                  Rezerve Et
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
