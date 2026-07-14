import { MagazaKarti, type MagazaKartiVeri } from "@/components/MagazaKarti";
import { MagazaKaydirici } from "./MagazaKaydirici";

// sunumTipi (2026-07-14): YeniEklenenler.tsx'teki grid/slider ikiliginin
// magaza karsiligi. "slider" TAM 2 (mobil) / 3 (sm+) kart genisliginde -
// YeniEklenenler'in "peek" (kismi sonraki kart gorunur) tarzindan FARKLI,
// kullanici acikca "yan yana 2/3 tezgah gosteren" istedigi icin kesin sayida
// kart hesaplanir (calc ile, gap dahil). Gercek carousel davranisi (ok +
// otomatik ilerleme + surukleme) etkilesim/zamanlayici gerektirdigi icin
// MagazaKaydirici'ye ("use client") devredilir - bu bilesen server component
// kalir, sadece grid modu kendi icinde render eder.
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
    return <MagazaKaydirici magazalar={magazalar} />;
  }

  return (
    <div className={`grid grid-cols-1 gap-6 sm:grid-cols-2 ${kolonSayisi === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
      {magazalar.map((magaza) => (
        <MagazaKarti key={magaza.id} magaza={magaza} />
      ))}
    </div>
  );
}
