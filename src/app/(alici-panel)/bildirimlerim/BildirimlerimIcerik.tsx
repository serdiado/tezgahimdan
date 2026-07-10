"use client";

import { useEffect, useTransition } from "react";
import Link from "next/link";
import { Bell, X } from "lucide-react";
import { bildirimRozetiTazele, bildirimSil, bildirimleriTemizle } from "./actions";

type BildirimSatir = {
  id: string;
  mesaj: string;
  createdAt: string;
  yeniMi: boolean;
  urunId: string | null;
  urunBaslik: string | null;
  magazaSlug: string | null;
  duyuruId: string | null;
  hedefYolu: string | null;
};

const tarihFormat = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

// Okundu isaretlemesi page.tsx'te (render sirasinda) sunucu tarafinda zaten
// oluyor - burada SADECE Router Cache'i tazeleyip SiteHeader rozetinin baska
// sayfalara F5 gerekmeden yansimasini sagliyoruz (bkz. actions.ts).
export function BildirimlerimIcerik({ bildirimler }: { bildirimler: BildirimSatir[] }) {
  const [bekliyor, gecisBaslat] = useTransition();

  useEffect(() => {
    bildirimRozetiTazele();
  }, []);

  if (bildirimler.length === 0) {
    return (
      <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl bg-white p-8 text-center shadow-sm">
        <Bell className="h-8 w-8 text-neutral-300" strokeWidth={1.5} />
        <p className="text-neutral-500">
          Henüz bir bildiriminiz yok. Takip ettiğiniz ürünlerde bir hareket olduğunda burada
          göreceksiniz.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => gecisBaslat(() => bildirimleriTemizle())}
          disabled={bekliyor}
          className="rounded-md px-2 py-1 text-xs font-medium text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 focus:ring-2 focus:ring-primary-200 focus:outline-none disabled:opacity-50"
        >
          Tümünü Temizle
        </button>
      </div>
      {bildirimler.map((b) => {
        // Hedef sirasi: urun varsa urune, duyuru pointer'i varsa duyuru detayina,
        // yoksa verilen hedefYolu'na (ör. sikayet sonucu). Hicbiri yoksa kart
        // TIKLANAMAZ. (urunId/duyuruId/hedefYolu gonderen kodda karsilikli
        // dislayicidir - biri doluysa oteki bos.)
        const href = b.urunId
          ? `/magaza/${b.magazaSlug}?urun=${b.urunId}`
          : b.duyuruId
            ? `/duyuru/${b.duyuruId}`
            : b.hedefYolu;
        const icerik = (
          <>
            <p className="text-sm text-neutral-800">{b.mesaj}</p>
            <p className="mt-1 text-xs text-neutral-500">{tarihFormat.format(new Date(b.createdAt))}</p>
          </>
        );
        // Sil butonu icerigin USTUNE bindirilir (mutlak konum) - <Link> icine
        // gomulmez (ic ice tiklanabilir oge olmaz). Icerige sag padding verilir
        // ki metin X'in altina girmesin.
        const sinif = `block rounded-2xl p-4 pr-10 shadow-sm ${b.yeniMi ? "bg-primary-50 ring-1 ring-primary-200" : "bg-white"}`;
        const silButonu = (
          <button
            type="button"
            onClick={() => gecisBaslat(() => bildirimSil(b.id))}
            disabled={bekliyor}
            aria-label="Bildirimi kaldır"
            className="absolute right-2 top-2 rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 focus:ring-2 focus:ring-primary-200 focus:outline-none disabled:opacity-50"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        );

        return (
          <div key={b.id} className="relative">
            {href ? (
              <Link href={href} className={sinif}>
                {icerik}
              </Link>
            ) : (
              <div className={sinif}>{icerik}</div>
            )}
            {silButonu}
          </div>
        );
      })}
    </div>
  );
}
