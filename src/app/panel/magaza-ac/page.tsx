import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getOwnMagaza } from "@/lib/magaza";
import { SiteHeader } from "@/components/SiteHeader";
import { MagazaAcForm } from "./MagazaAcForm";

// Onboarding sayfasi: SADECE giris sarti (satici geciti YOK) - kullanici henuz
// satici degil, mağaza acinca terfi edecek. Zaten magazasi varsa panele yollariz.
export default async function MagazaAcPage() {
  const session = await auth();
  if (!session?.user?.id) {
    // GECICI TESHIS (2026-07-14, sorun dogrulaninca KALDIRILACAK): giris yapmis
    // kullanicinin "Tezgah Aç"ta login ekranina atilmasi vakasini kesinlestirmek
    // icin. Bu satir LOG'a DUSERSE istek sunucuya ULASMISTIR (sorun cerez/oturum
    // tarafinda); kullanici dongudeyken HIC dusmezse istek sunucuya hic gelmemis
    // (tarayici router onbellegi / bayat kopya). Yalniz cerez ADLARI yazilir
    // (deger DEGIL - gizlilik).
    const cerezAdlari = (await cookies()).getAll().map((c) => c.name).join(",") || "(yok)";
    console.log(`[MAGAZA-AC-DEBUG] oturum yok -> /giris | cerezler: ${cerezAdlari}`);
    redirect("/giris?next=%2Fpanel%2Fmagaza-ac");
  }

  const mevcut = await getOwnMagaza(session.user.id);
  if (mevcut) {
    redirect("/panel");
  }

  // Admin panelinden eklenen tum aktif pazarlar - Ana Sayfa'daki ayni sorgu
  // (src/app/page.tsx) ile ayni desen, artik statik varsayilan-pazar.json'a
  // degil gercek Pazar tablosuna bakiyoruz. Kullanicinin profil telefonu varsa
  // sihirbazin WhatsApp alanina on-dolum olarak gecilir (2026-07-13 istegi:
  // "profilde telefon varsa tezgahta da gorunsun") - degistirilebilir.
  const [pazarlar, kullanici] = await Promise.all([
    prisma.pazar.findMany({
      where: { aktifMi: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.kullanici.findUnique({
      where: { id: session.user.id },
      select: { telefon: true },
    }),
  ]);

  return (
    <div className="min-h-screen bg-neutral-50">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-6">
        <h1 className="text-xl font-bold text-neutral-900">Tezgahını Aç</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Birkaç adımda tezgahını kur, ürünlerini sergilemeye başla.
        </p>
        {pazarlar.length === 0 ? (
          <p className="mt-4 rounded-lg border border-neutral-200 p-3 text-sm text-neutral-600">
            Şu anda aktif bir pazar yok, bu yüzden tezgah açılamıyor. Lütfen daha sonra tekrar
            deneyin.
          </p>
        ) : (
          <MagazaAcForm
            pazarlar={pazarlar.map((pazar) => ({ id: pazar.id, ad: pazar.ad, il: pazar.il, ilce: pazar.ilce }))}
            profilTelefonu={kullanici?.telefon ?? null}
          />
        )}
      </main>
    </div>
  );
}
