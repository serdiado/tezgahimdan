import Link from "next/link";
import { kategoriIkonuSec, kategoriRengiSec } from "@/lib/kategori-renkleri";
import type { KategoriCipi } from "@/app/YeniEklenenler";
import { UrunKarti, type UrunKartiVeri } from "./UrunKarti";

// 2026-07-15: bilesen artik "use client" DEGIL ve kategori filtresi SUNUCUDA.
// Gerekce YeniEklenenler.tsx ile ayni: liste artik sayfali (take), o yuzden
// cipleri yuklenen urunlerden turetmek YANILTICI olurdu - pencerede gorunmeyen
// kategorinin cipi hic cikmaz, secilen kategori yeni sette yoksa liste bombos
// gorunurdu. Sayfalama oncesinde liste tam oldugu icin bu dogruydu; sayfalama
// eklenirken duzeltilmesi ZORUNLU hale geldi.
export function MagazaIcerik({
  urunler,
  kategoriler,
  secilenKategoriId,
  kategoriHrefUret,
  girisli,
  kullaniciTelefonVar,
  magazaSlug,
  urunYokMesaji = "Bu tezgahta şu an sergide ürün yok.",
}: {
  urunler: UrunKartiVeri[];
  kategoriler: KategoriCipi[];
  secilenKategoriId: string | null;
  kategoriHrefUret: (kategoriId: string | null) => string;
  girisli: boolean;
  kullaniciTelefonVar: boolean;
  magazaSlug: string;
  urunYokMesaji?: string;
}) {
  // Satilmis urunler (gecmis satislarin gorunur kalmasi karari, bkz.
  // docs/mimari/magaza-iletisim-ve-degerlendirme.md) sergide/doldu urunlerle
  // AYNI izgarada karismasin diye ayri bir blokta, sonda gosterilir.
  // NOT: bu ayrim SAYFA ICINDE yapilir - yani "Daha Önce Satılanlar" bolumu
  // yalnizca o ana kadar yuklenmis urunleri gosterir, "Daha Fazla" basildikca
  // buyur. Tam ayri bir sayfalama vermek iki bagimsiz sayfa sayaci gerektirirdi.
  const aktifUrunler = urunler.filter((u) => u.durum !== "satildi");
  const satilanUrunler = urunler.filter((u) => u.durum === "satildi");

  // Cip YOKSA (tezgahta hic urun yok) filtre satirini hic cizme.
  if (kategoriler.length === 0) {
    return <p className="text-neutral-500">{urunYokMesaji}</p>;
  }

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

      {urunler.length === 0 ? (
        <p className="text-neutral-500">Bu kategoride sergide ürün yok.</p>
      ) : (
        <>
          {aktifUrunler.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
              {aktifUrunler.map((urun) => (
                <UrunKarti
                  key={urun.id}
                  urun={urun}
                  girisli={girisli}
                  kullaniciTelefonVar={kullaniciTelefonVar}
                  magazaSlug={magazaSlug}
                />
              ))}
            </div>
          )}

          {satilanUrunler.length > 0 && (
            <div className={aktifUrunler.length > 0 ? "mt-10" : ""}>
              <h2 className="mb-4 text-base font-semibold text-neutral-700">Daha Önce Satılanlar</h2>
              <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
                {satilanUrunler.map((urun) => (
                  <UrunKarti
                    key={urun.id}
                    urun={urun}
                    girisli={girisli}
                    kullaniciTelefonVar={kullaniciTelefonVar}
                    magazaSlug={magazaSlug}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
