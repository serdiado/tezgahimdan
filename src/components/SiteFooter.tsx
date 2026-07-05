import Link from "next/link";

// Tek blok, cok kolonlu site-map degil (gorsel sadelik kurali) - marka+slogan,
// birkac nav linki, Seferihisar pazari hakkinda kisa statik paragraf, KVKK linki.
export function SiteFooter() {
  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-col gap-1">
          <span className="text-lg font-bold tracking-tight text-primary-600">Tezgahımdan</span>
          <span className="text-sm text-neutral-500">Üreten Kadın&apos;ın Tezgahı</span>
        </div>

        <nav className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-neutral-600">
          <Link href="/#magazalar" className="hover:text-primary-600">
            Mağazalar
          </Link>
          <Link href="/panel/magaza-ac" className="hover:text-primary-600">
            Mağaza Aç
          </Link>
          <Link href="/kvkk" className="hover:text-primary-600">
            Aydınlatma Metni
          </Link>
        </nav>

        <p className="mt-6 max-w-2xl text-sm text-neutral-500">
          Tezgahımdan, Seferihisar Belediyesi&apos;nin kadın üreticilere tahsis ettiği
          kadın emeği pazarındaki el yapımı ürünleri dijitale taşır. Ürününü online
          rezerve et, pazar günü tezgahtan elden teslim al — ödeme pazarda, elden
          yapılır.
        </p>
      </div>
    </footer>
  );
}
