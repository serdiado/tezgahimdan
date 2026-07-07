import Link from "next/link";

// Icerik tamamen bos ise (hic ozellestirilmemis pazar) HIC render edilmez -
// bkz. page.tsx cagiran kosulu. Gorsel varsa arka plan, yoksa duz marka rengi
// zemin (kutsal kural burada GECERLI: vitrin tarafinda basit kalmali, admin
// tarafinin CMS derinligi burada gorsel karmasaya donusmemeli).
export function AnasayfaHero({
  baslik,
  aciklama,
  ctaMetni,
  ctaLink,
  gorselUrl,
}: {
  baslik: string;
  aciklama: string;
  ctaMetni: string;
  ctaLink: string;
  gorselUrl: string | null;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-primary-600 px-6 py-10 text-white sm:px-10 sm:py-14"
      style={
        gorselUrl
          ? { backgroundImage: `linear-gradient(rgba(23,10,17,0.45), rgba(23,10,17,0.45)), url(${gorselUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
          : undefined
      }
    >
      <div className="max-w-xl">
        {baslik && <h1 className="text-2xl font-bold text-balance sm:text-3xl">{baslik}</h1>}
        {aciklama && <p className="mt-3 text-sm text-white/90 sm:text-base">{aciklama}</p>}
        {ctaMetni && ctaLink && (
          <Link
            href={ctaLink}
            className="mt-5 inline-block rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-primary-700 hover:bg-primary-50"
          >
            {ctaMetni}
          </Link>
        )}
      </div>
    </div>
  );
}
