"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Camera, ImagePlus, X } from "lucide-react";
import { gorseliIsle } from "@/lib/gorsel";

// FotografSecici.tsx'in tek-slot sadelestirilmis hali: siralama/kapak-secme
// mantigi yok, tek fotograf. Kendi API cagrisini kendi yapar (MagazaTakipButonu
// ile ayni "self-contained, router.refresh() ile senkron" desen) - urun-ekle
// akisinin aksine, bu form gonderiminin bir parcasi degil, ayri bir yukleme.
export function KrokiFotografSecici({ baslangicUrl }: { baslangicUrl: string | null }) {
  const router = useRouter();
  const [krokiUrl, setKrokiUrl] = useState(baslangicUrl);
  const [isleniyor, setIsleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const cekRef = useRef<HTMLInputElement>(null);
  const galeriRef = useRef<HTMLInputElement>(null);

  async function dosyaSecildi(liste: FileList | null) {
    const dosya = liste?.[0];
    if (!dosya || dosya.size === 0) return;
    setHata(null);
    setIsleniyor(true);
    try {
      const islenmis = await gorseliIsle(dosya);
      const fd = new FormData();
      fd.set("kroki", islenmis);
      const res = await fetch("/api/panel/magaza-kroki", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setHata(data.hata ?? "fotoğraf yüklenemedi");
        return;
      }
      setKrokiUrl(data.krokiFotoUrl);
      router.refresh();
    } finally {
      setIsleniyor(false);
    }
  }

  async function kaldir() {
    setHata(null);
    setIsleniyor(true);
    try {
      const res = await fetch("/api/panel/magaza-kroki", { method: "DELETE" });
      if (!res.ok) {
        setHata("fotoğraf kaldırılamadı");
        return;
      }
      setKrokiUrl(null);
      router.refresh();
    } finally {
      setIsleniyor(false);
    }
  }

  return (
    <div>
      <span className="block text-sm font-medium text-neutral-700">Tezgah/Kroki Fotoğrafı (opsiyonel)</span>
      <p className="mt-0.5 text-xs text-neutral-400">
        Tezgahınızın fotoğrafını ya da elle çizdiğiniz bir krokiyi çekip yükleyebilirsiniz.
      </p>

      <input
        ref={cekRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          dosyaSecildi(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={galeriRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          dosyaSecildi(e.target.files);
          e.target.value = "";
        }}
      />

      {krokiUrl ? (
        <div className="mt-2 flex items-center gap-3">
          <div className="relative h-24 w-24 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
            <Image src={krokiUrl} alt="Tezgah/kroki fotoğrafı" fill unoptimized className="object-cover" sizes="96px" />
          </div>
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              disabled={isleniyor}
              onClick={() => galeriRef.current?.click()}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
            >
              Değiştir
            </button>
            <button
              type="button"
              disabled={isleniyor}
              onClick={kaldir}
              className="flex items-center gap-1 rounded-md border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
              Kaldır
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isleniyor}
            onClick={() => cekRef.current?.click()}
            className="flex items-center gap-1.5 rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
          >
            <Camera className="h-4 w-4" strokeWidth={2} />
            Fotoğraf Çek
          </button>
          <button
            type="button"
            disabled={isleniyor}
            onClick={() => galeriRef.current?.click()}
            className="flex items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
          >
            <ImagePlus className="h-4 w-4" strokeWidth={2} />
            Galeriden Seç
          </button>
        </div>
      )}

      {isleniyor && <p className="mt-2 text-sm text-neutral-500">Yükleniyor…</p>}
      {hata && <p className="mt-2 text-sm text-red-600">{hata}</p>}
    </div>
  );
}
