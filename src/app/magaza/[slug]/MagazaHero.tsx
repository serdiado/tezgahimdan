import Image from "next/image";
import { MapPin, MessageCircle, Tent } from "lucide-react";

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
            href={`https://wa.me/${magaza.whatsappNo.replace(/^\+/, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md bg-white/15 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/25"
          >
            <MessageCircle className="h-4 w-4" strokeWidth={2} />
            WhatsApp&apos;tan Yaz
          </a>
        )}
        {magaza.krokiFotoUrl && (
          <a
            href={magaza.krokiFotoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="relative h-14 w-14 overflow-hidden rounded-lg border-2 border-white/30"
            aria-label="Tezgah/kroki fotoğrafını büyüt"
          >
            <Image src={magaza.krokiFotoUrl} alt="Tezgah/kroki fotoğrafı" fill className="object-cover" sizes="56px" />
          </a>
        )}
      </div>
    </div>
  );
}
