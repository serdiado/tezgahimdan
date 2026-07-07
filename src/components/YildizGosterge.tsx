import { Star } from "lucide-react";

// Salt-okunur N-yildiz gosterge (ortalama+sayi). Varsayilan: degerlendirmeSayisi
// ===0 ise HIC render edilmez (begeniSayisi===0 icin karttaki gizleme ilkesiyle
// ayni: gereksiz "0 yildiz" UI gurultusu olmasin) - urun kartlarinda/detay
// modalinda bu davranis korunuyor. `bosGoster` ile bu istisna edilebilir:
// magaza kartlarinda (ana sayfa, takip ettigim magazalar) henuz degerlendirmesi
// olmayan bir magazanin da "bos 5 yildiz" gostermesi istendi - kesif/vitrin
// baglaminda "bu magaza hic degerlendirilmemis" bilgisi kendisi bir sinyal.
// Amber renk secimi DURUM_STIL'deki ("doldu" -> amber) mevcut semantik renk
// kullanimiyla tutarli - yeni bir dekoratif marka rengi degil.
export function YildizGosterge({
  ortalama,
  sayi,
  boyut = "sm",
  bosGoster = false,
}: {
  ortalama: number;
  sayi: number;
  boyut?: "sm" | "md";
  bosGoster?: boolean;
}) {
  if (sayi === 0 && !bosGoster) return null;
  const boyutClass = boyut === "md" ? "h-5 w-5" : "h-4 w-4";

  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`${boyutClass} ${
              i <= Math.round(ortalama) ? "fill-amber-400 text-amber-400" : "text-neutral-300"
            }`}
            strokeWidth={1.5}
          />
        ))}
      </div>
      {sayi > 0 && (
        <span className="text-xs text-neutral-500">
          {ortalama.toFixed(1)} ({sayi})
        </span>
      )}
    </div>
  );
}
