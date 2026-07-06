import Link from "next/link";
import { Bell, Heart } from "lucide-react";
import { signOut } from "@/auth";
import { oturumRolOku } from "@/lib/yetki";
import { prisma } from "@/lib/prisma";

// Vitrin + panel sayfalarinda ust bar. Sol: marka (ana sayfaya link). Sag:
// oturum durumuna gore navigasyon - admin icin "Yonetim", satici icin "Panelim",
// satici/admin olmayan giris yapmis kullaniciya "Magaza Ac" (self-servis
// onboarding), giris yapmamis icin "Giris". oturumRolOku rolu DB'den okur (JWT
// bayat olsa da dogru) - boylece bir kullanici magaza acip satici olunca header
// hemen guncellenir.
export async function SiteHeader() {
  const { session, rol } = await oturumRolOku();
  const girisli = !!session?.user;
  const satici = rol === "satici";
  const admin = rol === "admin";
  const okunmamisSayisi = girisli
    ? await prisma.bildirim.count({ where: { kullaniciId: session.user.id, okunduMu: false } })
    : 0;

  return (
    <div className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center">
          <img src="/tezgahimdan-logo.svg" alt="Tezgahımdan" width={142} height={36} className="h-9 w-auto" />
        </Link>
        <nav className="flex items-center gap-4 text-sm font-medium">
          {girisli && (
            <>
              <Link
                href="/favorilerim"
                aria-label="Favorilerim"
                className="text-neutral-500 hover:text-primary-600"
              >
                <Heart className="h-5 w-5" strokeWidth={2} />
              </Link>
              <Link
                href="/bildirimlerim"
                aria-label="Bildirimlerim"
                className="relative text-neutral-500 hover:text-primary-600"
              >
                <Bell className="h-5 w-5" strokeWidth={2} />
                {okunmamisSayisi > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary-600 px-1 text-[10px] font-bold text-white">
                    {okunmamisSayisi > 9 ? "9+" : okunmamisSayisi}
                  </span>
                )}
              </Link>
            </>
          )}
          {girisli ? (
            <>
              {admin ? (
                <Link href="/admin" className="text-neutral-700 hover:text-primary-600">
                  Yönetim
                </Link>
              ) : satici ? (
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
