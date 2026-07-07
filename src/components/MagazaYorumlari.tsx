import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { YildizGosterge } from "@/components/YildizGosterge";

type MagazaYorumu = { id: string; kullaniciAd: string; puan: number; yorum: string; tarih: string };

// Urun detay modalindaki yorum listesi deseniyle ayni gorsel dil, ama urun
// yorumlariyla KARISMASIN diye ayri bir bilesen - magaza sayfasinin genel
// akisinda (kart izgarasinin ustunde) gosterilir. Yorum yoksa hic render
// edilmez (YildizGosterge'nin sayi===0 gizleme ilkesiyle tutarli).
//
// Sadece EN SON 4 yorum "blok" (2x2 grid) olarak onizlenir (yorumlar prop'u
// zaten cagiran tarafta take:4 ile sinirlanip geliyor) - yorum sayisi
// buyudukce (or. 100) hero'nun altinin sonsuza uzamasi yerine, tum liste
// AYRI bir sayfada (`/magaza/[slug]/yorumlar`, magaza+urun yorumlarini iki
// sekmede birlestiren) gosterilir. Her blok VE "Tumunu Gor" o sayfaya link.
export function MagazaYorumlari({
  yorumlar,
  magazaSlug,
  toplamSayi,
}: {
  yorumlar: MagazaYorumu[];
  magazaSlug: string;
  toplamSayi: number;
}) {
  if (yorumlar.length === 0) return null;

  return (
    <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-neutral-900">Mağaza Yorumları</h2>
        <Link
          href={`/magaza/${magazaSlug}/yorumlar`}
          className="flex items-center gap-0.5 text-sm font-medium text-primary-600 hover:underline"
        >
          Tümünü Gör ({toplamSayi})
          <ChevronRight className="h-4 w-4" strokeWidth={2} />
        </Link>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {yorumlar.map((y) => (
          <Link
            key={y.id}
            href={`/magaza/${magazaSlug}/yorumlar`}
            className="rounded-xl border border-neutral-100 p-3 hover:bg-neutral-50"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-neutral-800">{y.kullaniciAd}</span>
              <span className="text-xs text-neutral-400">{y.tarih}</span>
            </div>
            <YildizGosterge ortalama={y.puan} sayi={1} />
            <p className="mt-1 line-clamp-3 text-sm text-neutral-600">{y.yorum}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
