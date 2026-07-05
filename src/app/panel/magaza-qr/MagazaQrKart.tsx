"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Printer } from "lucide-react";

// PaylasButonlari.tsx'teki ayni desen: sunucuda window yok, mutlak link SADECE
// istemcide anlamli - render govdesinde hesaplanir, ayri bir state/effect gerekmez
// (React Compiler'in set-state-in-effect kurali bu yuzden burada devreye girmez).
function mutlakLink(slug: string): string {
  if (typeof window === "undefined") return `/magaza/${slug}`;
  return `${window.location.origin}/magaza/${slug}`;
}

// QR modulleri her zaman siyah-beyaz kalir - marka rengi (mercan-pembe) kontrasti
// dusurup ucuz yazicilarda/kagitta okunabilirligi riske atar, bu yuzden burada
// bilerek marka paletine uyulmuyor. Kart cercevesi/basligi marka rengini korur.
export function MagazaQrKart({ ad, slug }: { ad: string; slug: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const link = mutlakLink(slug);

  useEffect(() => {
    let iptal = false;
    QRCode.toDataURL(link, { width: 320, margin: 2 })
      .then((url) => {
        if (!iptal) setDataUrl(url);
      })
      .catch(() => {
        if (!iptal) setDataUrl(null);
      });
    return () => {
      iptal = true;
    };
  }, [link]);

  return (
    <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
      <h2 className="font-bold text-neutral-900">{ad}</h2>
      <div className="mt-4 flex justify-center">
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- data: URL, next/image bunu optimize edemez
          <img src={dataUrl} alt={`${ad} mağaza sayfası QR kodu`} width={320} height={320} />
        ) : (
          <div className="flex h-[320px] w-[320px] items-center justify-center rounded-lg bg-neutral-100 text-sm text-neutral-400">
            QR kod hazırlanıyor…
          </div>
        )}
      </div>
      {/* Sunucu/istemci hidrasyon uyusmazligi olmasin diye (mutlakLink render
          govdesinde window'a bakiyor) linki sadece istemcide QR hazir olunca
          gosteriyoruz - QR gorseliyle zaten ayni ana bagli. */}
      {dataUrl && <p className="mt-3 break-all text-xs text-neutral-500">{link}</p>}
      <button
        type="button"
        onClick={() => window.print()}
        disabled={!dataUrl}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60 print:hidden"
      >
        <Printer className="h-4 w-4" strokeWidth={2} />
        Yazdır
      </button>
    </div>
  );
}
