import { YildizGosterge } from "@/components/YildizGosterge";

type MagazaYorumu = { id: string; kullaniciAd: string; puan: number; yorum: string; tarih: string };

// Urun detay modalindaki yorum listesi deseniyle ayni gorsel dil, ama urun
// yorumlariyla KARISMASIN diye ayri bir bilesen - magaza sayfasinin genel
// akisinda (kart izgarasinin ustunde) gosterilir. Yorum yoksa hic render
// edilmez (YildizGosterge'nin sayi===0 gizleme ilkesiyle tutarli).
export function MagazaYorumlari({ yorumlar }: { yorumlar: MagazaYorumu[] }) {
  if (yorumlar.length === 0) return null;

  return (
    <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="font-semibold text-neutral-900">Mağaza Yorumları</h2>
      <div className="mt-3 space-y-3">
        {yorumlar.map((y) => (
          <div key={y.id} className="border-t border-neutral-100 pt-3 first:border-t-0 first:pt-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-neutral-800">{y.kullaniciAd}</span>
              <span className="text-xs text-neutral-400">{y.tarih}</span>
            </div>
            <YildizGosterge ortalama={y.puan} sayi={1} />
            <p className="mt-1 text-sm text-neutral-600">{y.yorum}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
