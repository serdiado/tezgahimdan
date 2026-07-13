import Link from "next/link";
import { Bell, Heart, CircleUserRound, TriangleAlert } from "lucide-react";
import { signOut } from "@/auth";
import { oturumRolOku } from "@/lib/yetki";
import { prisma } from "@/lib/prisma";
import { saticininBekleyenIslemleriGetir } from "@/lib/rezervasyon";

// Vitrin + panel sayfalarinda ust bar. Sol: marka (ana sayfaya link). Sag:
// oturum durumuna gore navigasyon - admin icin "Yonetim", satici icin "Panelim",
// satici/admin olmayan giris yapmis kullaniciya "Magaza Ac" (self-servis
// onboarding), giris yapmamis icin "Giris". oturumRolOku rolu DB'den okur (JWT
// bayat olsa da dogru) - boylece bir kullanici magaza acip satici olunca header
// hemen guncellenir.
//
// Satici icin bekleyen-islem uyarisi (2026-07-09 karari): panel/layout.tsx
// zorunlu ekrani SADECE /panel altindaki sayfalarda devreye girer - satici
// vitrinde/anasayfada gezinirken bundan habersiz kalmasin diye SiteHeader
// (site genelinde kullanilan tek bar) burada da bir uyari seridi gosterir.
// Tiklaninca /panel'e gider, layout.tsx orada zaten zorunlu ekrani acar.
export async function SiteHeader() {
  const { session, rol } = await oturumRolOku();
  const girisli = !!session?.user;
  const satici = rol === "satici";
  const admin = rol === "admin";
  const [okunmamisSayisi, bekleyenIslemSayisi] = await Promise.all([
    girisli ? prisma.bildirim.count({ where: { kullaniciId: session.user.id, okunduMu: false, silindiMi: false } }) : 0,
    satici ? saticininBekleyenIslemleriGetir(session!.user.id).then((b) => b.length) : 0,
  ]);

  return (
    <div className="border-b border-neutral-200 bg-white">
      {bekleyenIslemSayisi > 0 && (
        <Link
          href="/panel"
          className="flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-900 hover:bg-amber-200"
        >
          <TriangleAlert className="h-4 w-4 shrink-0" strokeWidth={2} />
          {bekleyenIslemSayisi} rezervasyon işaretlenmeyi bekliyor - panele girmek için tıkla
        </Link>
      )}
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
              <Link
                href="/rezervasyonum"
                aria-label="Profilim"
                className="text-neutral-500 hover:text-primary-600"
              >
                <CircleUserRound className="h-5 w-5" strokeWidth={2} />
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
              ) : null}
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
