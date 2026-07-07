"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Star } from "lucide-react";

export type DegerlendirmeAdminVeri = {
  id: string;
  tur: "urun" | "magaza";
  kullaniciAd: string;
  hedefEtiket: string;
  puan: number;
  yorum: string | null;
  gizliMi: boolean;
  tarih: string;
};

const API_YOLU: Record<DegerlendirmeAdminVeri["tur"], string> = {
  urun: "/api/admin/degerlendirme-gizle",
  magaza: "/api/admin/magaza-degerlendirme-gizle",
};

export function DegerlendirmeKartAdmin({ degerlendirme }: { degerlendirme: DegerlendirmeAdminVeri }) {
  const router = useRouter();
  const [bekliyor, setBekliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  async function gizleGoster(gizle: boolean) {
    setHata(null);
    setBekliyor(true);
    const res = await fetch(API_YOLU[degerlendirme.tur], {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ degerlendirmeId: degerlendirme.id, gizle }),
    });
    setBekliyor(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setHata(data.hata ?? "işlem başarısız");
      return;
    }
    router.refresh();
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-0.5 text-sm font-semibold text-amber-500">
              <Star className="h-3.5 w-3.5 fill-current" strokeWidth={0} />
              {degerlendirme.puan}
            </span>
            <span className="text-sm font-medium text-neutral-900">{degerlendirme.kullaniciAd}</span>
            {degerlendirme.gizliMi && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                Gizli
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-neutral-500">
            {degerlendirme.hedefEtiket} · {degerlendirme.tarih}
          </p>
          {degerlendirme.yorum && <p className="mt-2 text-sm text-neutral-700">{degerlendirme.yorum}</p>}
        </div>
        <div className="shrink-0">
          {degerlendirme.gizliMi ? (
            <button
              type="button"
              onClick={() => gizleGoster(false)}
              disabled={bekliyor}
              className="flex items-center gap-1 rounded-md border border-neutral-300 px-2 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 disabled:opacity-60"
            >
              <Eye className="h-3.5 w-3.5" strokeWidth={2} />
              Göster
            </button>
          ) : (
            <button
              type="button"
              onClick={() => gizleGoster(true)}
              disabled={bekliyor}
              className="flex items-center gap-1 rounded-md border border-neutral-300 px-2 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 disabled:opacity-60"
            >
              <EyeOff className="h-3.5 w-3.5" strokeWidth={2} />
              Gizle
            </button>
          )}
        </div>
      </div>
      {hata && <p className="mt-2 text-xs text-red-600">{hata}</p>}
    </div>
  );
}
