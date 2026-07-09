import { MagazaKarti, type MagazaKartiVeri } from "@/components/MagazaKarti";

export function MagazaVitrini({
  magazalar,
  kolonSayisi = 3,
}: {
  magazalar: MagazaKartiVeri[];
  kolonSayisi?: 3 | 4;
}) {
  if (magazalar.length === 0) {
    return (
      <p className="text-neutral-500">
        Henüz aktif tezgah yok. Yakında burada tezgahlar açılacak.
      </p>
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
