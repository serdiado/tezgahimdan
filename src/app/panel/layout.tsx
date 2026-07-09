import type { ReactNode } from "react";
import { auth } from "@/auth";
import { getOwnMagaza } from "@/lib/magaza";
import { SiteHeader } from "@/components/SiteHeader";

// Panel'deki TUM sayfalar icin TEK ortak kapi: pazar pasiflestirilince (bkz.
// schema.prisma Pazar.aktifMi yorumu) bagli magazanin sahibi hicbir panel
// sayfasina giremez. Rol/yetki (satici mi) kontrolu BURADA YAPILMAZ - her sayfa
// kendi getSaticiSession() kontrolunu koruyor (magaza-ac ozellikle alici rolu
// icin acik kalmali, bu layout'un ELINE gecmemesi bilincli). Magaza yoksa (ör.
// henuz onboarding'de olan alici) kontrol devre disi kalir, sayfa normal render olur.
export default async function PanelLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (session?.user?.id) {
    const magaza = await getOwnMagaza(session.user.id);
    if (magaza && !magaza.pazar.aktifMi) {
      return (
        <div className="min-h-screen bg-neutral-50">
          <SiteHeader />
          <main className="mx-auto max-w-2xl px-4 py-6">
            <h1 className="text-xl font-bold text-neutral-900">Bu Pazar Artık Aktif Değil</h1>
            <p className="mt-1 text-neutral-600">
              Tezgahın bağlı olduğu <span className="font-semibold">{magaza.pazar.ad}</span> pazarı
              artık aktif değil, bu yüzden panele giriş yapamıyorsun. Tezgahın ve ürünlerin
              kalıcı olarak silinmedi. Sorular için bizimle iletişime geçebilirsin.
            </p>
          </main>
        </div>
      );
    }
  }
  return <>{children}</>;
}
