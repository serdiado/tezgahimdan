import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Aydınlatma Metni · Tezgahımdan",
};

// Taslak sayfa (PLAN.md SS7 "Hafif hukuk" notu): telefon numarasi sakladigimiz
// icin bir link/route simdiden var olsun, ama gercek hukuki metin gelene kadar
// bunu acikca "hazirlaniyor" diye belirtiyoruz - sahte/placeholder metni gercek
// aydinlatma metni gibi sunmuyoruz.
export default function KvkkSayfasi() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-xl font-bold text-neutral-900">
          Kişisel Verilerin Korunması (KVKK) Aydınlatma Metni
        </h1>
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          Bu metin hazırlanıyor. Şu an platformda kayıtlı kişisel veriler (ad ve
          telefon numaran) yalnızca rezervasyon sürecini yürütmek için kullanılır;
          tam aydınlatma metni yayınlandığında bu sayfa güncellenecektir.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
