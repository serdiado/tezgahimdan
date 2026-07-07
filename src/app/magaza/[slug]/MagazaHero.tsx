import { MapPin, Tent } from "lucide-react";
import { WhatsappIkon } from "@/components/PaylasButonlari";
import { KrokiGorseli } from "./KrokiGorseli";

const GUN_ETIKETI: Record<string, string> = {
  Pazartesi: "Pazartesi",
  Sali: "Salı",
  Carsamba: "Çarşamba",
  Persembe: "Perşembe",
  Cuma: "Cuma",
  Cumartesi: "Cumartesi",
  PazarGunu: "Pazar",
};

export function MagazaHero({
  magaza,
}: {
  magaza: {
    ad: string;
    aciklama: string | null;
    whatsappNo: string | null;
    tezgahBilgisi: string | null;
    krokiFotoUrl: string | null;
    pazar: { ad: string; sifirlamaGunu: string };
  };
}) {
  return (
    <div className="rounded-2xl bg-linear-to-br from-primary-600 to-primary-700 px-6 py-8 text-white shadow-sm sm:px-8 sm:py-10">
      <p className="flex items-center gap-1.5 text-sm font-medium text-primary-100">
        <MapPin className="h-4 w-4" strokeWidth={2} />
        {magaza.pazar.ad} · her {GUN_ETIKETI[magaza.pazar.sifirlamaGunu] ?? magaza.pazar.sifirlamaGunu}
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">{magaza.ad}</h1>
      {magaza.aciklama && <p className="mt-2 max-w-xl text-primary-50">{magaza.aciklama}</p>}
      {magaza.tezgahBilgisi && (
        <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-primary-100">
          <Tent className="h-4 w-4" strokeWidth={2} />
          Tezgah: {magaza.tezgahBilgisi}
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {magaza.whatsappNo && (
          <a
            href={`https://wa.me/${magaza.whatsappNo.replace(/^\+/, "")}?text=${encodeURIComponent(
              `Merhaba ${magaza.ad}, bir konuda danışmak istiyorum: `,
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md bg-[#25D366] px-3 py-1.5 text-sm font-semibold text-white hover:brightness-95"
          >
            <WhatsappIkon className="h-4 w-4" />
            WhatsApp&apos;tan Yaz
          </a>
        )}
        {magaza.krokiFotoUrl && <KrokiGorseli krokiFotoUrl={magaza.krokiFotoUrl} />}
      </div>
    </div>
  );
}
