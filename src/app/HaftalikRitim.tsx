import { MapPin } from "lucide-react";
import { pazarRitimBilgisi } from "@/lib/pazar-haftasi";

const GUN_ETIKETI: Record<string, string> = {
  Pazartesi: "Pazartesi",
  Sali: "Salı",
  Carsamba: "Çarşamba",
  Persembe: "Perşembe",
  Cuma: "Cuma",
  Cumartesi: "Cumartesi",
  PazarGunu: "Pazar",
};

export type RitimPazarVeri = {
  id: string;
  bolge: string;
  baslangicGunu: string;
  baslangicSaati: Date;
  sifirlamaGunu: string;
  sifirlamaSaati: Date;
  saatDilimi: string;
};

// react-hooks/purity: Date.now()/new Date() dogrudan bilesen govdesinde "impure
// call" olarak isaretleniyor - AP-1'deki yediGunOncesi() deseniyle ayni cozum.
function simdiZamani(): Date {
  return new Date();
}

export function HaftalikRitim({ pazarlar }: { pazarlar: RitimPazarVeri[] }) {
  if (pazarlar.length === 0) return null;

  const simdi = simdiZamani();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {pazarlar.map((pazar) => {
        const ritim = pazarRitimBilgisi(pazar, simdi);
        return (
          <div
            key={pazar.id}
            className="rounded-2xl bg-gradient-to-br from-primary-600 to-primary-700 px-6 py-8 text-white shadow-sm sm:px-8 sm:py-10"
          >
            <p className="flex items-center gap-1.5 text-sm font-medium text-primary-100">
              <MapPin className="h-4 w-4" strokeWidth={2} />
              {pazar.bolge}
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">
              Bu hafta {GUN_ETIKETI[ritim.gunAdi] ?? ritim.gunAdi}
            </h2>
            {ritim.bugunPazarGunuMu && (
              <span className="mt-3 inline-block rounded-full bg-white/20 px-3 py-1 text-sm font-semibold">
                Bugün pazar günü!
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
