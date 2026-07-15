import Link from "next/link";
import { kategoriIkonuSec, kategoriRengiSec } from "@/lib/kategori-renkleri";
import { UrunKarti, type UrunKartiVeri } from "./magaza/[slug]/UrunKarti";

export type YeniUrunVeri = UrunKartiVeri & {
  magaza: { ad: string; slug: string; degerlendirmeOrtalamasi: number | null; degerlendirmeSayisi: number };
};

export type KategoriCipi = { id: string; ad: string; sira: number };

// 2026-07-15: bilesen artik "use client" DEGIL ve kategori filtresi SUNUCUDA.
//
// Eskiden cipler prop'la gelen urunlerden useMemo ile turetiliyor, filtre de
// istemcide yapiliyordu. Liste `take: ogeSayisi` ile sinirli oldugu icin bu
// YANILTICIYDI: DB'de 30 "Mutfaktan" urunu varken 12'lik pencerede 2 tanesi
// varsa kullanici 2 gorup bunu tum katalog saniyordu; pencerede hic gorunmeyen
// kategorinin cipi ise hic cikmiyordu (urun var, kesfedilemiyor). Sayfalama
// eklenince bu daha da bozulurdu - secili kategori yeni sette yoksa liste
// bombos gorunurdu. Artik cipler TUM kategorilerden (gorunur urunu olanlardan)
// geliyor, filtre Prisma where'ine giriyor.
//
// <Link> (button degil): JS'siz calisir, paylasilabilir, geri tusu dogru.
export function YeniEklenenler({
  urunler,
  kategoriler,
  secilenKategoriId,
  kategoriHrefUret,
  girisli,
  kullaniciTelefonVar,
  kolonSayisi = 3,
  sunumTipi = "grid",
}: {
  urunler: YeniUrunVeri[];
  kategoriler: KategoriCipi[];
  secilenKategoriId: string | null;
  // Cip linkini cagiran sayfa uretir - ana sayfa ile magaza sayfasi farkli
  // parametre kumesi tasiyor (q / slug). null = "Tumu".
  kategoriHrefUret: (kategoriId: string | null) => string;
  girisli: boolean;
  kullaniciTelefonVar: boolean;
  kolonSayisi?: 3 | 4;
  sunumTipi?: "grid" | "slider";
}) {
  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href={kategoriHrefUret(null)}
          scroll={false}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
            secilenKategoriId === null
              ? "bg-primary-600 text-white"
              : "bg-white text-neutral-600 ring-1 ring-inset ring-neutral-200 hover:bg-neutral-100"
          }`}
        >
          Tümü
        </Link>
        {kategoriler.map((kategori) => {
          const renk = kategoriRengiSec(kategori.id);
          const Ikon = kategoriIkonuSec(kategori.ad);
          const secili = secilenKategoriId === kategori.id;
          return (
            <Link
              key={kategori.id}
              href={kategoriHrefUret(kategori.id)}
              scroll={false}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                secili ? `${renk.bg} ${renk.text} ring-1 ring-inset ${renk.border}` : "bg-white text-neutral-600 ring-1 ring-inset ring-neutral-200 hover:bg-neutral-100"
              }`}
            >
              <Ikon className="h-4 w-4" strokeWidth={2} />
              {kategori.ad}
            </Link>
          );
        })}
      </div>

      {sunumTipi === "slider" ? (
        <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:gap-4">
          {urunler.map((urun) => (
            <div key={urun.id} className="w-[68%] shrink-0 snap-start sm:w-[42%] lg:w-[29%]">
              <UrunKarti
                urun={urun}
                magaza={urun.magaza}
                magazaSlug={urun.magaza.slug}
                girisli={girisli}
                kullaniciTelefonVar={kullaniciTelefonVar}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className={`grid grid-cols-2 gap-3 sm:gap-6 ${kolonSayisi === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
          {urunler.map((urun) => (
            <UrunKarti
              key={urun.id}
              urun={urun}
              magaza={urun.magaza}
              magazaSlug={urun.magaza.slug}
              girisli={girisli}
              kullaniciTelefonVar={kullaniciTelefonVar}
            />
          ))}
        </div>
      )}

      {urunler.length === 0 && (
        <p className="py-8 text-center text-sm text-neutral-500">Bu kategoride ürün yok.</p>
      )}
    </div>
  );
}
