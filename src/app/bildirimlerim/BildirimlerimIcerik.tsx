import Link from "next/link";
import { Bell } from "lucide-react";

type BildirimSatir = {
  id: string;
  mesaj: string;
  createdAt: string;
  yeniMi: boolean;
  urunId: string;
  urunBaslik: string;
  magazaSlug: string;
};

const tarihFormat = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

// Salt-goruntuleme liste - tiklanabilir aksiyon yok (okundu isaretlemesi
// sayfa acilinca sunucu tarafinda otomatik olur), bu yuzden client component
// degil.
export function BildirimlerimIcerik({ bildirimler }: { bildirimler: BildirimSatir[] }) {
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
          href={`/magaza/${b.magazaSlug}?urun=${b.urunId}`}
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
