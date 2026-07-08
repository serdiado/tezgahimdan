import { MapPin, Tent } from "lucide-react";
import type { SayfaModulTuru } from "@/generated/prisma";
import { WhatsappIkon } from "@/components/PaylasButonlari";
import { YildizGosterge } from "@/components/YildizGosterge";
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

export type MagazaHeroBileseni = {
  // SayfaModulTuru (Prisma) - sayfaModulleriGetir("magaza_hero") sadece 3
  // magaza_hero_* degerini DONDURUR ama tipi hala TUM enum'u kapsiyor (Prisma
  // dondurulen `where` argumanina gore tur daraltmiyor). asagidaki switch zaten
  // sadece bu 3 case'i isliyor, digerleri icin undefined doner (JSX'te sorun
  // degil) - bu yuzden burada dar bir union yerine tam SayfaModulTuru kullanilir.
  tur: SayfaModulTuru;
  aktifMi: boolean;
};

export function MagazaHero({
  magaza,
  degerlendirme,
  bilesenSirasi,
}: {
  magaza: {
    ad: string;
    aciklama: string | null;
    whatsappNo: string | null;
    tezgahBilgisi: string | null;
    krokiFotoUrl: string | null;
    pazar: { ad: string; sifirlamaGunu: string };
  };
  degerlendirme: { ortalama: number; sayi: number };
  // Faz 4.2 (CMS): admin /admin/magaza-sablonu'ndan bu 3 bilesenin sirasini/
  // gorunurlugunu TUM magazalar icin tek bir sablon karari olarak belirler -
  // magazaya OZGU degil (bkz. src/lib/sayfa-modulu.ts, sayfa="magaza_hero").
  bilesenSirasi: MagazaHeroBileseni[];
}) {
  function bilesenRenderEt(bilesen: MagazaHeroBileseni) {
    switch (bilesen.tur) {
      case "magaza_hero_whatsapp":
        return (
          magaza.whatsappNo && (
            <a
              key={bilesen.tur}
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
          )
        );
      case "magaza_hero_kroki":
        return magaza.krokiFotoUrl && <KrokiGorseli key={bilesen.tur} krokiFotoUrl={magaza.krokiFotoUrl} />;
      case "magaza_hero_puan":
        // YildizGosterge'nin ic renkleri (text-neutral-500/300) acik zemin
        // varsayar - yeni bir "koyu tema" varyanti eklemek yerine (bkz.
        // feedback_gorsel-tasarim-sadelik hafiza notu: yeni aksan/varyant
        // ekleme) DUZ beyaz bir cip icine koyup bilesene DOKUNMUYORUZ, boylece
        // urun/magaza kartlarindaki AYNI gorunumle tutarli kalir.
        return (
          <div key={bilesen.tur} className="rounded-md bg-white px-3 py-1.5">
            <YildizGosterge ortalama={degerlendirme.ortalama} sayi={degerlendirme.sayi} boyut="sm" bosGoster />
          </div>
        );
    }
  }

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
        {bilesenSirasi.filter((b) => b.aktifMi).map(bilesenRenderEt)}
      </div>
    </div>
  );
}
