import { redirect } from "next/navigation";
import { getSaticiSession } from "@/lib/yetki";
import { getOwnMagaza } from "@/lib/magaza";
import { SiteHeader } from "@/components/SiteHeader";
import { KuyrukKarti } from "./KuyrukKarti";
import { saticininKuyrukKartVerisi } from "./kuyruk-verisi";

export default async function RezervasyonlarSayfasi() {
  const { session, yetkili } = await getSaticiSession();
  if (!session) {
    redirect("/giris");
  }
  if (!yetkili) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <SiteHeader />
        <main className="mx-auto max-w-2xl px-4 py-6">
          <h1 className="text-xl font-bold text-neutral-900">Yetkisiz Erişim</h1>
          <p className="mt-1 text-neutral-600">Bu sayfaya sadece satıcı hesapları erişebilir.</p>
        </main>
      </div>
    );
  }

  const magaza = await getOwnMagaza(session.user.id);

  // Yetki sinifi: SADECE bu saticinin kendi magazasinin urunleri ve onlarin
  // rezervasyonlari cekilir - baska magazanin verisine erisim yok. Bekleyen VE
  // sonuclanan (satildi/gelmedi/iptal) kayitlarin hepsi cekilir; "hicbir kayit
  // silinmez" ilkesi geregi sonuclananlar da ekranda gorunur.
  const urunKartlari = magaza ? await saticininKuyrukKartVerisi(magaza.id) : [];

  return (
    <div className="min-h-screen bg-neutral-50">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="text-xl font-bold text-neutral-900">Gelen Rezervasyonlar</h1>
        {!magaza ? (
          <p className="mt-2 text-neutral-600">Henüz tezgahınız yok.</p>
        ) : urunKartlari.length === 0 ? (
          <p className="mt-2 text-neutral-600">Henüz ürününüz yok.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {urunKartlari.map((urun) => (
              <KuyrukKarti key={urun.id} urun={urun} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
