"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { bildirimRozetiTazele } from "./actions";

type BildirimSatir = {
  id: string;
  mesaj: string;
  createdAt: string;
  yeniMi: boolean;
  urunId: string | null;
  urunBaslik: string | null;
  magazaSlug: string | null;
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
      {bildirimler.map((b) => (
        <Link
          key={b.id}
          href={b.urunId ? `/magaza/${b.magazaSlug}?urun=${b.urunId}` : "/sikayetlerim"}
          className={`block rounded-2xl p-4 shadow-sm ${
            b.yeniMi ? "bg-primary-50 ring-1 ring-primary-200" : "bg-white"
          }`}
        >
          <p className="text-sm text-neutral-800">{b.mesaj}</p>
          <p className="mt-1 text-xs text-neutral-500">{tarihFormat.format(new Date(b.createdAt))}</p>
        </Link>
      ))}
    </div>
  );
}
