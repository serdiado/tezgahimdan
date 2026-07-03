import Link from "next/link";
import { signOut } from "@/auth";
import { getSaticiSession } from "@/lib/yetki";

// Vitrin + panel sayfalarinda ust bar. Sol: marka (ana sayfaya link). Sag:
// oturum durumuna gore navigasyon - giris yapmis satici icin "Panelim", satici
// olmayan giris yapmis kullaniciya "Magaza Ac" (self-servis onboarding), giris
// yapmamis icin "Giris". getSaticiSession rolu DB'den okur (JWT bayat olsa da
// dogru) - boylece bir kullanici magaza acip satici olunca header hemen guncellenir.
export async function SiteHeader() {
  const { session, yetkili: satici } = await getSaticiSession();
  const girisli = !!session?.user;

  return (
    <div className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight text-primary-600">
          Tezgahımdan
        </Link>
        <nav className="flex items-center gap-4 text-sm font-medium">
          {girisli ? (
            <>
              {satici ? (
                <Link href="/panel" className="text-neutral-700 hover:text-primary-600">
                  Panelim
                </Link>
              ) : (
                <Link
                  href="/panel/magaza-ac"
                  className="rounded-md bg-primary-600 px-3 py-1.5 font-semibold text-white hover:bg-primary-700"
                >
                  Mağaza Aç
                </Link>
              )}
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button type="submit" className="text-neutral-500 hover:text-neutral-800">
                  Çıkış Yap
                </button>
              </form>
            </>
          ) : (
            <Link href="/giris" className="text-neutral-700 hover:text-primary-600">
              Giriş
            </Link>
          )}
        </nav>
      </div>
    </div>
  );
}
