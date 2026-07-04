import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getOwnMagaza } from "@/lib/magaza";
import { SiteHeader } from "@/components/SiteHeader";
import { MagazaAcForm } from "./MagazaAcForm";
import varsayilanPazar from "../../../../prisma/varsayilan-pazar.json";

// Onboarding sayfasi: SADECE giris sarti (satici geciti YOK) - kullanici henuz
// satici degil, mağaza acinca terfi edecek. Zaten magazasi varsa panele yollariz.
export default async function MagazaAcPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/giris?next=%2Fpanel%2Fmagaza-ac");
  }

  const mevcut = await getOwnMagaza(session.user.id);
  if (mevcut) {
    redirect("/panel");
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-6">
        <h1 className="text-xl font-bold text-neutral-900">Mağazanı Aç</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Birkaç adımda mağazanı kur, ürünlerini sergilemeye başla.
        </p>
        <MagazaAcForm pazarAd={varsayilanPazar.ad} />
      </main>
    </div>
  );
}
