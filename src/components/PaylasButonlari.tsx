"use client";

import { useEffect, useState } from "react";
import { Share2, Link2, Check } from "lucide-react";

const fiyatFormat = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });

// WhatsApp logosu (lucide'de yok) - kucuk inline SVG.
function WhatsappIkon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.47 14.38c-.29-.15-1.7-.84-1.96-.93-.26-.1-.45-.15-.64.14-.19.29-.74.93-.9 1.12-.17.19-.33.22-.62.07-.29-.15-1.22-.45-2.33-1.44-.86-.77-1.44-1.72-1.61-2.01-.17-.29-.02-.45.13-.6.13-.13.29-.34.44-.51.15-.17.19-.29.29-.48.1-.19.05-.36-.02-.51-.08-.15-.64-1.55-.88-2.12-.23-.55-.47-.48-.64-.49-.17-.01-.36-.01-.55-.01-.19 0-.51.07-.77.36-.26.29-1.01.99-1.01 2.41 0 1.42 1.04 2.8 1.18 2.99.15.19 2.04 3.12 4.95 4.38.69.3 1.23.48 1.65.61.69.22 1.32.19 1.82.12.56-.08 1.7-.7 1.94-1.36.24-.67.24-1.24.17-1.36-.07-.12-.26-.19-.55-.34zM12.04 21.5h-.01a9.4 9.4 0 0 1-4.8-1.32l-.34-.2-3.57.94.95-3.48-.22-.36a9.42 9.42 0 0 1-1.44-5.02c0-5.2 4.24-9.44 9.45-9.44 2.52 0 4.89.98 6.67 2.77a9.38 9.38 0 0 1 2.76 6.68c0 5.2-4.24 9.45-9.45 9.45zm8.04-17.49A11.36 11.36 0 0 0 12.04.5C5.79.5.7 5.59.7 11.84c0 2 .52 3.95 1.51 5.67L.6 23.5l6.13-1.61a11.33 11.33 0 0 0 5.31 1.35h.01c6.25 0 11.34-5.09 11.34-11.34 0-3.03-1.18-5.88-3.31-8.03z" />
    </svg>
  );
}

// Iki paylasim yolu: (1) WhatsApp'ta Paylas (wa.me - hedefi kullanici WhatsApp'in
// kendi listesinden secer), (2) Paylas (Web Share API; mumkunse kapak fotografiyla).
// Web Share desteklenmiyorsa "Baglantiyi Kopyala"ya duser.
export function PaylasButonlari({
  baslik,
  fiyat,
  urunLink,
  kapakFotoUrl,
  tamGenislik = false,
}: {
  baslik: string;
  fiyat: number;
  urunLink: string;
  kapakFotoUrl?: string | null;
  // true ise: iki buton (WhatsApp + Paylas/Kopyala) sarma olmadan, ustteki
  // satirla (ornegin Rezerve Et satiri) ayni tam genisligi esit paylasir -
  // kart grid'inde genislik degisken oldugu icin flex-1 kullanilir, sabit
  // piksel degil (bkz. UrunKarti.tsx tasarim guncellemesi).
  tamGenislik?: boolean;
}) {
  const [paylasVar, setPaylasVar] = useState(false);
  const [kopyalandi, setKopyalandi] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  // Clipboard API de guvenli baglam (HTTPS/localhost) ister - HTTP uzerinden
  // (or. LAN IP ile telefondan test) erisimde clipboard.writeText basarisiz
  // olur. Bu durumda linki elle secilebilir bir alanda gosteririz, aksi halde
  // "elle secebilirsiniz" mesaji secilecek hicbir sey olmadan kalirdi.
  const [elleKopyalaLinki, setElleKopyalaLinki] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- istemci ozellik tespiti; hydration uyumsuzlugunu onlemek icin mount sonrasi
    setPaylasVar(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  // urunLink goreli ("/magaza/...") gelebilir; paylasim mutlak URL ister. Cozumu
  // tiklama aninda yapariz (SSR'da window yok).
  function mutlakLink(): string {
    if (typeof window === "undefined") return urunLink;
    return urunLink.startsWith("http") ? urunLink : `${window.location.origin}${urunLink}`;
  }
  function paylasMetni(): string {
    return `${baslik} — ${fiyatFormat.format(fiyat)}\n${mutlakLink()}`;
  }

  function whatsappPaylas() {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(paylasMetni())}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  async function kopyala() {
    setHata(null);
    setElleKopyalaLinki(null);
    try {
      await navigator.clipboard.writeText(mutlakLink());
      setKopyalandi(true);
      setTimeout(() => setKopyalandi(false), 2000);
    } catch {
      setHata("kopyalanamadı, bağlantıyı aşağıdan elle seçebilirsiniz");
      setElleKopyalaLinki(mutlakLink());
    }
  }

  async function webPaylas() {
    setHata(null);
    const veri: ShareData = { title: baslik, text: paylasMetni(), url: mutlakLink() };
    // Mumkunse kapak fotografini da ekle (files).
    if (kapakFotoUrl && typeof navigator.canShare === "function") {
      try {
        const res = await fetch(kapakFotoUrl);
        const blob = await res.blob();
        const dosya = new File([blob], "urun.jpg", { type: blob.type || "image/jpeg" });
        if (navigator.canShare({ files: [dosya] })) {
          await navigator.share({ ...veri, files: [dosya] });
          return;
        }
      } catch (e) {
        if ((e as Error)?.name === "AbortError") return; // kullanici iptal etti
        // foto eklenemezse metinle devam
      }
    }
    try {
      await navigator.share(veri);
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") kopyala();
    }
  }

  const butonTaban = "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold";
  const butonGenislik = tamGenislik ? "flex-1 justify-center" : "";

  return (
    <div className={`flex items-center gap-2 ${tamGenislik ? "" : "flex-wrap"}`}>
      <button
        type="button"
        onClick={whatsappPaylas}
        className={`${butonTaban} ${butonGenislik} bg-[#25D366] text-white hover:brightness-95`}
      >
        <WhatsappIkon className="h-4 w-4" />
        WhatsApp&apos;ta Paylaş
      </button>

      {paylasVar ? (
        <button
          type="button"
          onClick={webPaylas}
          className={`${butonTaban} ${butonGenislik} border border-neutral-300 text-neutral-700 hover:bg-neutral-100`}
        >
          <Share2 className="h-4 w-4" strokeWidth={2} />
          Paylaş
        </button>
      ) : (
        <button
          type="button"
          onClick={kopyala}
          className={`${butonTaban} ${butonGenislik} border border-neutral-300 text-neutral-700 hover:bg-neutral-100`}
        >
          {kopyalandi ? (
            <>
              <Check className="h-4 w-4 text-green-600" strokeWidth={2.5} />
              Kopyalandı
            </>
          ) : (
            <>
              <Link2 className="h-4 w-4" strokeWidth={2} />
              Bağlantıyı Kopyala
            </>
          )}
        </button>
      )}

      {hata && <span className="w-full text-xs text-red-600">{hata}</span>}
      {elleKopyalaLinki && (
        <input
          type="text"
          readOnly
          value={elleKopyalaLinki}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-700"
        />
      )}
    </div>
  );
}
