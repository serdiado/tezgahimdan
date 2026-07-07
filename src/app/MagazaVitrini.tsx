import { MagazaKarti, type MagazaKartiVeri } from "@/components/MagazaKarti";

export function MagazaVitrini({ magazalar }: { magazalar: MagazaKartiVeri[] }) {
  if (magazalar.length === 0) {
    return (
      <p className="text-neutral-500">
        Henüz aktif mağaza yok. Yakında burada tezgahlar açılacak.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {magazalar.map((magaza) => (
        <MagazaKarti key={magaza.id} magaza={magaza} />
      ))}
    </div>
  );
}
