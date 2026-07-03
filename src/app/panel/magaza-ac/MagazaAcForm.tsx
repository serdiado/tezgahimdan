"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Store } from "lucide-react";
import { slugTuret } from "@/lib/slug";

// Kisa sihirbaz (2 adim): (1) mağaza adı + otomatik bağlantı (+ pazar bilgisi),
// (2) WhatsApp (opsiyonel). Pazar SP-4'e kadar tek varsayilan oldugu icin ayri bir
// secim adimi degil, 1. adimda bilgi olarak gosterilir (bos tiki olmasin).
export function MagazaAcForm({ pazarAd }: { pazarAd: string }) {
  const router = useRouter();
  const [adim, setAdim] = useState<1 | 2>(1);
  const [ad, setAd] = useState("");
  const [slugManuel, setSlugManuel] = useState<string | null>(null);
  const [slugDuzenle, setSlugDuzenle] = useState(false);
  const [whatsapp, setWhatsapp] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  const slug = slugManuel !== null ? slugManuel : slugTuret(ad);

  function devam() {
    setHata(null);
    if (!ad.trim()) {
      setHata("mağaza adı zorunlu");
      return;
    }
    if (!slug) {
      setHata("bağlantı üretilemedi — lütfen harf içeren bir ad girin veya bağlantıyı elle yazın");
      return;
    }
    setAdim(2);
  }

  async function magazayiAc() {
    setHata(null);
    setGonderiliyor(true);
    const res = await fetch("/api/panel/magaza-ac", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ad: ad.trim(), slug, whatsappNo: whatsapp.trim() || undefined }),
    });
    setGonderiliyor(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setHata(data.hata ?? "mağaza açılamadı");
      // Slug/ad kaynakli hataysa 1. adima don ki duzeltebilsin.
      if (res.status === 409 || res.status === 400) setAdim(1);
      return;
    }
    // Rol artik satici (DB'den okunuyor) - ilk urun ekleme ekranina gecelim.
    router.push("/panel/urun-ekle");
    router.refresh();
  }

  return (
    <div className="mt-5">
      {/* Adim gostergesi */}
      <div className="mb-4 flex items-center gap-2 text-xs font-medium text-neutral-500">
        <span className={adim === 1 ? "text-primary-600" : ""}>1. Mağaza</span>
        <span className="h-px flex-1 bg-neutral-200" />
        <span className={adim === 2 ? "text-primary-600" : ""}>2. İletişim</span>
      </div>

      {adim === 1 ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700">
              Mağaza Adı
              <input
                type="text"
                value={ad}
                onChange={(e) => setAd(e.target.value)}
                placeholder="ör. Ayşe'nin Tezgahı"
                maxLength={100}
                autoFocus
                className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              />
            </label>
          </div>

          {/* Baglanti onizleme + duzenle */}
          <div className="rounded-lg bg-neutral-100 p-3">
            <p className="text-xs text-neutral-500">Mağaza bağlantın</p>
            {slugDuzenle ? (
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlugManuel(e.target.value.toLowerCase())}
                className="mt-1 block w-full rounded-md border border-neutral-300 px-2 py-1 text-sm"
              />
            ) : (
              <p className="mt-0.5 break-all text-sm text-neutral-800">
                tezgahimdan.com/magaza/<span className="font-semibold">{slug || "…"}</span>
              </p>
            )}
            <button
              type="button"
              onClick={() => setSlugDuzenle((a) => !a)}
              className="mt-1 text-xs font-medium text-primary-600 hover:underline"
            >
              {slugDuzenle ? "Otomatik bağlantıyı kullan" : "Bağlantıyı düzenle"}
            </button>
            <p className="mt-1 text-xs text-neutral-400">
              Bağlantı mağazanı açtıktan sonra değiştirilemez (paylaştığın bağlantı kırılmasın).
            </p>
          </div>

          {/* Pazar bilgisi (tek varsayilan - SP-4'te secilebilir olacak) */}
          <div className="flex items-start gap-2 rounded-lg border border-neutral-200 p-3 text-sm text-neutral-600">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" strokeWidth={2} />
            <span>
              Mağazan <span className="font-semibold text-neutral-800">{pazarAd}</span> pazarına
              bağlanacak.
            </span>
          </div>

          {hata && <p className="text-sm text-red-600">{hata}</p>}

          <button
            type="button"
            onClick={devam}
            className="w-full rounded-md bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
          >
            Devam
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700">
              WhatsApp No <span className="font-normal text-neutral-400">(opsiyonel)</span>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="05XX XXX XX XX"
                className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              />
            </label>
            <p className="mt-1 text-xs text-neutral-400">
              Alıcılar sana buradan ulaşır. Şimdi atlayabilir, sonra Mağaza Ayarları&apos;ndan
              ekleyebilirsin.
            </p>
          </div>

          {hata && <p className="text-sm text-red-600">{hata}</p>}

          <button
            type="button"
            onClick={magazayiAc}
            disabled={gonderiliyor}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
          >
            <Store className="h-4 w-4" strokeWidth={2} />
            {gonderiliyor ? "Açılıyor…" : "Mağazayı Aç"}
          </button>
          <button
            type="button"
            onClick={() => {
              setHata(null);
              setAdim(1);
            }}
            className="w-full text-sm font-medium text-neutral-500 hover:text-neutral-800"
          >
            Geri
          </button>
        </div>
      )}
    </div>
  );
}
