import { MagazaKarti, type MagazaKartiVeri } from "@/components/MagazaKarti";

// sunumTipi (2026-07-14): YeniEklenenler.tsx'teki grid/slider ikiliginin
// magaza karsiligi. "slider" TAM 2 (mobil) / 3 (sm+) kart genisliginde -
// YeniEklenenler'in "peek" (kismi sonraki kart gorunur) tarzindan FARKLI,
// kullanici acikca "yan yana 2/3 tezgah gosteren" istedigi icin kesin sayida
// kart hesaplanir (calc ile, gap dahil). JS/state gerekmez - native overflow-x
// + scroll-snap yeterli, bilesen server component kalabilir.
export function MagazaVitrini({
  magazalar,
  kolonSayisi = 3,
  sunumTipi = "grid",
}: {
  magazalar: MagazaKartiVeri[];
  kolonSayisi?: 3 | 4;
  sunumTipi?: "grid" | "slider";
}) {
  if (magazalar.length === 0) {
    return (
      <p className="text-neutral-500">
        Henüz aktif tezgah yok. Yakında burada tezgahlar açılacak.
      </p>
    );
  }

  if (sunumTipi === "slider") {
    return (
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:gap-4">
        {magazalar.map((magaza) => (
          <div
            key={magaza.id}
            className="w-[calc((100%-12px)/2)] shrink-0 snap-start sm:w-[calc((100%-32px)/3)]"
          >
            <MagazaKarti magaza={magaza} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 gap-6 sm:grid-cols-2 ${kolonSayisi === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
      {magazalar.map((magaza) => (
        <MagazaKarti key={magaza.id} magaza={magaza} />
      ))}
    </div>
  );
}
