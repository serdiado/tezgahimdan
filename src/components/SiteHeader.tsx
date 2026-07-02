import Link from "next/link";
import { auth, signOut } from "@/auth";

// Vitrin + panel sayfalarinda ust bar. Sol: marka (ana sayfaya link). Sag:
// oturum durumuna gore navigasyon - giris yapmis satici/admin icin "Panelim" +
// "Cikis Yap", giris yapmamis icin "Giris". auth() server-side calisir, bu
// yuzden SiteHeader async server component.
export async function SiteHeader() {
  const session = await auth();
  const girisli = !!session?.user;
  const panelliRol = session?.user?.rol === "satici" || session?.user?.rol === "admin";

  return (
    <div className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight text-primary-600">
          Tezgahımdan
        </Link>
        <nav className="flex items-center gap-4 text-sm font-medium">
          {girisli ? (
            <>
              {panelliRol && (
                <Link href="/panel" className="text-neutral-700 hover:text-primary-600">
                  Panelim
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
