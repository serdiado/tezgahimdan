import Link from "next/link";

// Tek blok, cok kolonlu site-map degil (gorsel sadelik kurali) - marka+slogan,
// birkac nav linki, Seferihisar pazari hakkinda kisa statik paragraf, KVKK linki.
// Koyu (primary-600) zemin: HaftalikRitim/MagazaHero'daki ayni "koyu mercan-pembe
// zeminde soluk metin" kalibi (text-primary-50/100) burada da aynen kullanilir -
// yeni bir ton icat edilmedi, mevcut skaladan.
export function SiteFooter() {
  return (
    <footer className="bg-primary-600">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-col items-start gap-1">
          <img
            src="/tezgahimdan-logo.svg"
            alt="Tezgahımdan"
            width={142}
            height={36}
            className="h-9 w-auto brightness-0 invert"
          />
          <span className="text-sm text-primary-100">Üreten Kadın&apos;ın Tezgahı</span>
        </div>

        <nav className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium">
          <Link href="/#magazalar" className="text-white hover:text-primary-100">
            Mağazalar
          </Link>
          <Link href="/panel/magaza-ac" className="text-white hover:text-primary-100">
            Mağaza Aç
          </Link>
          <Link href="/kvkk" className="text-white hover:text-primary-100">
            Aydınlatma Metni
          </Link>
        </nav>

        <p className="mt-6 max-w-2xl text-sm text-primary-50">
          Tezgahımdan, Seferihisar Belediyesi&apos;nin kadın üreticilere tahsis ettiği
          kadın emeği pazarındaki el yapımı ürünleri dijitale taşır. Ürününü online
          rezerve et, pazar günü tezgahtan elden teslim al — ödeme pazarda, elden
          yapılır.
        </p>
      </div>
    </footer>
  );
}
