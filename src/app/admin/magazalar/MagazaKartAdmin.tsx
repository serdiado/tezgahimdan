"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Eye, EyeOff, PackagePlus } from "lucide-react";

const DURUM_STIL: Record<string, { etiket: string; className: string }> = {
  aktif: { etiket: "Aktif", className: "bg-green-100 text-green-700" },
  gizli: { etiket: "Gizli", className: "bg-amber-100 text-amber-700" },
  silindi: { etiket: "Silinmiş", className: "bg-neutral-200 text-neutral-600" },
};

const tarihFormat = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric" });

export type MagazaAdminVeri = {
  id: string;
  ad: string;
  slug: string;
  sahipAd: string;
  pazarAd: string;
  gizliMi: boolean;
  silindiMi: boolean;
  urunSayisi: number;
  olusturulmaTarihi: string;
};

export function MagazaKartAdmin({ magaza }: { magaza: MagazaAdminVeri }) {
  const router = useRouter();
  const [gizleOnay, setGizleOnay] = useState(false);
  const [bekliyor, setBekliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const durumAnahtari = magaza.silindiMi ? "silindi" : magaza.gizliMi ? "gizli" : "aktif";
  const stil = DURUM_STIL[durumAnahtari];

  async function gizleGoster(gizle: boolean) {
    setHata(null);
    setBekliyor(true);
    const res = await fetch("/api/admin/magaza-gizle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ magazaId: magaza.id, gizle }),
    });
    setBekliyor(false);
    setGizleOnay(false);
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
            <h3 className="font-semibold text-neutral-900">{magaza.ad}</h3>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${stil.className}`}>
              {stil.etiket}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-neutral-500">
            {magaza.sahipAd} · {magaza.pazarAd} · {magaza.urunSayisi} ürün ·{" "}
            {tarihFormat.format(new Date(magaza.olusturulmaTarihi))}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {!magaza.silindiMi && (
            <Link
              href={`/admin/magazalar/${magaza.id}/urun-ekle`}
              className="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:underline"
            >
              <PackagePlus className="h-3.5 w-3.5" strokeWidth={2} />
              Ürün Ekle
            </Link>
          )}
          <Link
            href={`/magaza/${magaza.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
            Vitrini Gör
          </Link>
        </div>
      </div>

      {!magaza.silindiMi && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {magaza.gizliMi ? (
            <button
              type="button"
              onClick={() => gizleGoster(false)}
              disabled={bekliyor}
              className="flex items-center gap-1 rounded-md border border-neutral-300 px-2 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 disabled:opacity-60"
            >
              <Eye className="h-3.5 w-3.5" strokeWidth={2} />
              Göster
            </button>
          ) : gizleOnay ? (
            <span className="flex flex-wrap items-center gap-1">
              <span className="text-xs text-neutral-600">Vitrinden kaldırılsın mı?</span>
              <button
                type="button"
                onClick={() => gizleGoster(true)}
                disabled={bekliyor}
                className="rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                Evet
              </button>
              <button
                type="button"
                onClick={() => setGizleOnay(false)}
                className="rounded-md bg-neutral-200 px-2 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-300"
              >
                Vazgeç
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setGizleOnay(true)}
              className="flex items-center gap-1 rounded-md border border-neutral-300 px-2 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
            >
              <EyeOff className="h-3.5 w-3.5" strokeWidth={2} />
              Gizle
            </button>
          )}
        </div>
      )}
      {hata && <p className="mt-2 text-xs text-red-600">{hata}</p>}
    </div>
  );
}
