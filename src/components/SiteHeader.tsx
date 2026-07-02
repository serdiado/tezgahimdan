// Vitrin sayfalarinda ust bar - sayfanin bir platformun (Tezgahimdan) parcasi
// oldugunu hissettirir. Sadece kimlik; navigasyon/aksiyon eklenmedi (henuz
// gerek yok, ileride buyurse ayri bir NavBar'a tasinabilir).
export function SiteHeader() {
  return (
    <div className="border-b border-neutral-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-3">
        <span className="text-lg font-bold tracking-tight text-primary-600">Tezgahımdan</span>
      </div>
    </div>
  );
}
