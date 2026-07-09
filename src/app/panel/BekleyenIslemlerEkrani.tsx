import { SiteHeader } from "@/components/SiteHeader";
import { KuyrukKarti } from "./rezervasyonlar/KuyrukKarti";
import { saticininKuyrukKartVerisi } from "./rezervasyonlar/kuyruk-verisi";
import type { BekleyenIslem } from "@/lib/rezervasyon";

// panel/layout.tsx'in zorunlu kapisi: satici, islem-sonu ani gecmis ama hala
// isaretlenmemis rezervasyonu oldugu surece panelin geri kalanina (children)
// ULASAMAZ - bu ekran onun yerine gosterilir. Amac: alici ASLA satici
// ihmalinden cezalanmasin (2026-07-09 karari) - gercegi bilen tek taraf
// (satici) isaretlemeye zorlanir, sistem hicbir tahminde bulunmaz.
//
// Ayni KuyrukKarti/rezervasyonSonuclandir akisini kullanir (yeni bir isaretleme
// mekanizmasi YOK) - satici "Sattı"/"Gelmedi" dedikce router.refresh() bu
// server component'i (ve dolayisiyla panel/layout.tsx'in ust duzey kontrolunu)
// yeniden calistirir; hepsi temizlenince otomatik olarak normal panele doner.
export async function BekleyenIslemlerEkrani({
  magazaId,
  bekleyenler,
}: {
  magazaId: string;
  bekleyenler: BekleyenIslem[];
}) {
  const urunIdler = [...new Set(bekleyenler.map((b) => b.urunId))];
  const urunKartlari = await saticininKuyrukKartVerisi(magazaId, urunIdler);

  return (
    <div className="min-h-screen bg-neutral-50">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <h1 className="text-lg font-bold text-amber-900">Bekleyen İşlemleriniz Var</h1>
          <p className="mt-1 text-sm text-amber-800">
            Aşağıdaki rezervasyonları &quot;Satıldı&quot; veya &quot;Gelmedi&quot; olarak
            işaretlemeden panelin diğer bölümlerine geçemezsiniz. Bu ürünler siz işaretleyene
            kadar tezgahınızda pasif görünür.
          </p>
        </div>
        <div className="mt-4 space-y-4">
          {urunKartlari.map((urun) => (
            <KuyrukKarti key={urun.id} urun={urun} />
          ))}
        </div>
      </main>
    </div>
  );
}
