"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BellRing, Heart } from "lucide-react";

type FavoriUrun = {
  urunId: string;
  urunBaslik: string;
  fiyat: number;
  durum: string;
  fotograf: string | null;
  magazaAd: string;
  magazaSlug: string;
  begeniMi: boolean;
  takipMi: boolean;
};

const fiyatFormat = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });

export function FavorilerimIcerik({ favoriler }: { favoriler: FavoriUrun[] }) {
  const router = useRouter();
  const [gonderilen, setGonderilen] = useState<string | null>(null);

  async function toggle(urunId: string, tur: "begeni" | "takip") {
    const anahtar = urunId + tur;
    setGonderilen(anahtar);
    const res = await fetch("/api/favori", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urunId, tur }),
    });
    setGonderilen(null);
    if (res.ok) router.refresh();
  }

  if (favoriler.length === 0) {
    return (
      <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl bg-white p-8 text-center shadow-sm">
        <Heart className="h-8 w-8 text-neutral-300" strokeWidth={1.5} />
        <p className="text-neutral-500">
          Henüz favori ürününüz yok. Mağazaları gezip beğendiğiniz ürünlere kalp bırakabilir ya da
          takibe alabilirsiniz.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {favoriler.map((f) => (
        <div key={f.urunId} className="flex gap-3 rounded-2xl bg-white p-4 shadow-sm">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
            {f.fotograf && (
              <Image src={f.fotograf} alt={f.urunBaslik} fill className="object-cover" sizes="64px" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <Link
              href={`/magaza/${f.magazaSlug}?urun=${f.urunId}`}
              className="truncate font-semibold text-neutral-900 hover:text-primary-600"
            >
              {f.urunBaslik}
            </Link>
            <p className="text-xs text-neutral-500">{f.magazaAd}</p>
            <p className="mt-1 text-sm font-semibold text-primary-700">{fiyatFormat.format(f.fiyat)}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {f.begeniMi && (
                <button
                  type="button"
                  onClick={() => toggle(f.urunId, "begeni")}
                  disabled={gonderilen === f.urunId + "begeni"}
                  className="flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-60"
                >
                  <Heart className="h-3.5 w-3.5 fill-red-500 text-red-500" strokeWidth={2} />
                  Beğeniyi kaldır
                </button>
              )}
              {f.takipMi && (
                <button
                  type="button"
                  onClick={() => toggle(f.urunId, "takip")}
                  disabled={gonderilen === f.urunId + "takip"}
                  className="flex items-center gap-1 rounded-md border border-primary-200 bg-primary-50 px-2 py-1 text-xs font-semibold text-primary-700 hover:bg-primary-100 disabled:opacity-60"
                >
                  <BellRing className="h-3.5 w-3.5" strokeWidth={2} />
                  Takibi bırak
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
