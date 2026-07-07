import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getMagazaBySlug } from "@/lib/magaza";
import { magazaUrunYorumlariGetir } from "@/lib/degerlendirme";
import { magazaDegerlendirmeOzeti, magazaYorumlariGetir } from "@/lib/magaza-degerlendirme";
import { SiteHeader } from "@/components/SiteHeader";
import { YildizGosterge } from "@/components/YildizGosterge";
import { YorumlarSekmeleri } from "./YorumlarSekmeleri";

const tarihFormat = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" });

// Hero'nun altindaki "4 blok" onizlemeden (`MagazaYorumlari.tsx`) "Tumunu Gor"
// ile buraya gelinir - magaza yorumlarinin TAMAMI + o magazanin TUM
// urunlerindeki yorumlar (Trendyol'daki "magaza degerlendirmesi" / "urun
// degerlendirmesi" ayrimi gibi) iki sekmede birlikte listelenir. Sayfalama
// YOK (bkz. magaza-degerlendirme.ts / degerlendirme.ts yorumlari - ayni
// "kucuk kalacagi varsayimi" kapsam karari).
export default async function MagazaYorumlariSayfasi({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const magaza = await getMagazaBySlug(slug);
  if (!magaza) notFound();

  const [magazaOzeti, magazaYorumlari, urunYorumlari] = await Promise.all([
    magazaDegerlendirmeOzeti(magaza.id),
    magazaYorumlariGetir(magaza.id),
    magazaUrunYorumlariGetir(magaza.id),
  ]);

  return (
    <div className="min-h-screen bg-neutral-50">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <Link
          href={`/magaza/${magaza.slug}`}
          className="flex items-center gap-1 text-sm font-medium text-neutral-500 hover:text-primary-600"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          {magaza.ad}
        </Link>
        <h1 className="mt-2 text-xl font-bold text-neutral-900">Değerlendirmeler</h1>
        <div className="mt-1">
          <YildizGosterge ortalama={magazaOzeti.ortalama} sayi={magazaOzeti.sayi} boyut="md" />
        </div>

        <div className="mt-4">
          <YorumlarSekmeleri
            magazaSlug={magaza.slug}
            magazaYorumlari={magazaYorumlari.map((y) => ({
              id: y.id,
              kullaniciAd: y.kullaniciAd,
              puan: y.puan,
              yorum: y.yorum,
              tarih: tarihFormat.format(y.createdAt),
            }))}
            urunYorumlari={urunYorumlari.map((y) => ({
              id: y.id,
              kullaniciAd: y.kullaniciAd,
              puan: y.puan,
              yorum: y.yorum,
              tarih: tarihFormat.format(y.createdAt),
              urunId: y.urunId,
              urunBaslik: y.urunBaslik,
            }))}
          />
        </div>
      </main>
    </div>
  );
}
