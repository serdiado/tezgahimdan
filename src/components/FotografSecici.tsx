"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Camera, ImagePlus, Star, X, GripVertical } from "lucide-react";
import { gorseliIsle } from "@/lib/gorsel";
import { MAX_FOTOGRAF } from "@/lib/urun-sabitleri";

export type FotoOge =
  | { tur: "mevcut"; anahtar: string; yol: string }
  | { tur: "yeni"; anahtar: string; file: File; onizleme: string };

function anahtarUret(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `f${Date.now()}${Math.round(Math.random() * 1e6)}`;
}

// Yonetilen coklu-foto secici: kamera ("Fotograf Cek", capture) + galeri
// ("Galeriden Sec", multiple). Her eklenen dosya gorseliIsle'den (EXIF + kucultme)
// gecer. Ilk oge = KAPAK. Kapak yap butonu + surukle-sirala (pointer events;
// touch+mouse). Isleme suresince "hazirlaniyor" gostergesi + parent'a isleniyor
// bilgisi (Gonder devre disi kalsin diye).
export function FotografSecici({
  baslangicMevcut = [],
  maxFoto = MAX_FOTOGRAF,
  onDegisim,
  onIsleniyorDegisti,
}: {
  baslangicMevcut?: string[];
  maxFoto?: number;
  onDegisim: (fotolar: FotoOge[]) => void;
  onIsleniyorDegisti?: (isleniyor: boolean) => void;
}) {
  const [fotolar, setFotolar] = useState<FotoOge[]>(() =>
    baslangicMevcut.map((yol) => ({ tur: "mevcut" as const, anahtar: anahtarUret(), yol })),
  );
  const [isleniyorSayisi, setIsleniyorSayisi] = useState(0);
  const [uyari, setUyari] = useState<string | null>(null);
  const [suruklenen, setSuruklenen] = useState<string | null>(null);

  const cekRef = useRef<HTMLInputElement>(null);
  const galeriRef = useRef<HTMLInputElement>(null);
  const ogeElemanlari = useRef<Map<string, HTMLElement>>(new Map());

  // Parent'a degisiklikleri bildir. onDegisim/onIsleniyorDegisti kararli (parent'ta
  // useState setter'lari) oldugundan dogrudan bagimlilik veriyoruz - render sirasinda
  // ref mutasyonu yok.
  useEffect(() => {
    onDegisim(fotolar);
  }, [fotolar, onDegisim]);
  useEffect(() => {
    onIsleniyorDegisti?.(isleniyorSayisi > 0);
  }, [isleniyorSayisi, onIsleniyorDegisti]);

  // Unmount'ta blob onizlemelerini serbest birak (ref effect'te senkronlanir).
  const fotolarRef = useRef(fotolar);
  useEffect(() => {
    fotolarRef.current = fotolar;
  }, [fotolar]);
  useEffect(
    () => () => {
      for (const o of fotolarRef.current) if (o.tur === "yeni") URL.revokeObjectURL(o.onizleme);
    },
    [],
  );

  async function dosyaEkle(liste: FileList | null) {
    setUyari(null);
    if (!liste) return;
    const secilenler = Array.from(liste).filter((f) => f.size > 0);
    const bosYer = maxFoto - fotolarRef.current.length;
    if (bosYer <= 0) {
      setUyari(`en fazla ${maxFoto} fotoğraf ekleyebilirsiniz`);
      return;
    }
    if (secilenler.length > bosYer) {
      setUyari(`en fazla ${maxFoto} fotoğraf — fazlası eklenmedi`);
    }
    const alinacak = secilenler.slice(0, bosYer);
    for (const file of alinacak) {
      setIsleniyorSayisi((n) => n + 1);
      try {
        const islenmis = await gorseliIsle(file);
        const onizleme = URL.createObjectURL(islenmis);
        setFotolar((prev) => {
          if (prev.length >= maxFoto) {
            URL.revokeObjectURL(onizleme);
            return prev;
          }
          return [...prev, { tur: "yeni", anahtar: anahtarUret(), file: islenmis, onizleme }];
        });
      } finally {
        setIsleniyorSayisi((n) => n - 1);
      }
    }
  }

  function kaldir(anahtar: string) {
    setUyari(null);
    setFotolar((prev) => {
      const oge = prev.find((o) => o.anahtar === anahtar);
      if (oge?.tur === "yeni") URL.revokeObjectURL(oge.onizleme);
      return prev.filter((o) => o.anahtar !== anahtar);
    });
  }

  function kapakYap(anahtar: string) {
    setFotolar((prev) => {
      const i = prev.findIndex((o) => o.anahtar === anahtar);
      if (i <= 0) return prev;
      const kopya = [...prev];
      const [oge] = kopya.splice(i, 1);
      kopya.unshift(oge);
      return kopya;
    });
  }

  // --- Surukle-sirala (pointer events: touch + mouse) ---
  function tutamacBasla(anahtar: string, e: React.PointerEvent) {
    setSuruklenen(anahtar);
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function tutamacHareket(e: React.PointerEvent) {
    if (!suruklenen) return;
    let hedef: string | null = null;
    let enYakin = Infinity;
    for (const [k, el] of ogeElemanlari.current) {
      const r = el.getBoundingClientRect();
      const d = Math.hypot(r.left + r.width / 2 - e.clientX, r.top + r.height / 2 - e.clientY);
      if (d < enYakin) {
        enYakin = d;
        hedef = k;
      }
    }
    if (hedef && hedef !== suruklenen) {
      setFotolar((prev) => {
        const from = prev.findIndex((o) => o.anahtar === suruklenen);
        const to = prev.findIndex((o) => o.anahtar === hedef);
        if (from < 0 || to < 0 || from === to) return prev;
        const kopya = [...prev];
        const [oge] = kopya.splice(from, 1);
        kopya.splice(to, 0, oge);
        return kopya;
      });
    }
  }
  function tutamacBitir() {
    setSuruklenen(null);
  }

  const dolu = fotolar.length >= maxFoto;

  return (
    <div>
      <p className="text-sm font-medium text-neutral-700">
        Fotoğraflar <span className="font-normal text-neutral-400">({fotolar.length}/{maxFoto})</span>
      </p>

      {fotolar.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {fotolar.map((oge, i) => {
            const kaynak = oge.tur === "yeni" ? oge.onizleme : oge.yol;
            return (
              <div
                key={oge.anahtar}
                ref={(el) => {
                  if (el) ogeElemanlari.current.set(oge.anahtar, el);
                  else ogeElemanlari.current.delete(oge.anahtar);
                }}
                className={`relative h-24 w-24 overflow-hidden rounded-lg border bg-neutral-100 ${
                  suruklenen === oge.anahtar ? "border-primary-500 opacity-60" : "border-neutral-200"
                } ${i === 0 ? "ring-2 ring-primary-500" : ""}`}
              >
                <Image src={kaynak} alt="" fill unoptimized className="object-cover" sizes="96px" />

                {i === 0 && (
                  <span className="absolute left-1 top-1 rounded bg-primary-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    Kapak
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => kaldir(oge.anahtar)}
                  aria-label="Fotoğrafı kaldır"
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
                >
                  <X className="h-3 w-3" strokeWidth={3} />
                </button>

                {i !== 0 && (
                  <button
                    type="button"
                    onClick={() => kapakYap(oge.anahtar)}
                    className="absolute bottom-1 left-1 flex items-center gap-0.5 rounded bg-white/85 px-1 py-0.5 text-[10px] font-semibold text-neutral-700 hover:bg-white"
                  >
                    <Star className="h-3 w-3" strokeWidth={2} />
                    Kapak
                  </button>
                )}

                <button
                  type="button"
                  aria-label="Sürükleyerek sırala"
                  onPointerDown={(e) => tutamacBasla(oge.anahtar, e)}
                  onPointerMove={tutamacHareket}
                  onPointerUp={tutamacBitir}
                  onPointerCancel={tutamacBitir}
                  style={{ touchAction: "none" }}
                  className="absolute bottom-1 right-1 cursor-grab touch-none rounded bg-white/85 p-0.5 text-neutral-600 hover:bg-white active:cursor-grabbing"
                >
                  <GripVertical className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Ekleme butonlari + gizli input'lar */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          ref={cekRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => {
            dosyaEkle(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={galeriRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            dosyaEkle(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={dolu}
          onClick={() => cekRef.current?.click()}
          className="flex items-center gap-1.5 rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
        >
          <Camera className="h-4 w-4" strokeWidth={2} />
          Fotoğraf Çek
        </button>
        <button
          type="button"
          disabled={dolu}
          onClick={() => galeriRef.current?.click()}
          className="flex items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
        >
          <ImagePlus className="h-4 w-4" strokeWidth={2} />
          Galeriden Seç
        </button>
      </div>

      {isleniyorSayisi > 0 && (
        <p className="mt-2 flex items-center gap-2 text-sm text-neutral-500">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-neutral-300 border-t-primary-600" />
          Fotoğraflar hazırlanıyor…
        </p>
      )}
      {uyari && <p className="mt-2 text-sm text-amber-600">{uyari}</p>}
      {fotolar.length > 1 && (
        <p className="mt-1 text-xs text-neutral-400">
          İlk fotoğraf kapaktır. Sürükleyerek sıralayabilir ya da “Kapak” ile öne alabilirsiniz.
        </p>
      )}
    </div>
  );
}
