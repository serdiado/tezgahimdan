import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { getAdminSession } from "@/lib/yetki";
import { prisma } from "@/lib/prisma";
import { platformAyarlariGetir } from "@/lib/platform-ayarlari";
import { SiteHeader } from "@/components/SiteHeader";
import { AdminNav } from "../AdminNav";
import { GuvenilirlikSifirlaButonu } from "./GuvenilirlikSifirlaButonu";

const tarihFormat = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric" });

export default async function AdminGuvenilirlikPage() {
  const { session, yetkili } = await getAdminSession();
  if (!session) {
    redirect("/giris");
  }

  let icerik;
  if (!yetkili) {
    icerik = (
      <>
        <h1 className="text-xl font-bold text-neutral-900">Yetkisiz Erişim</h1>
        <p className="mt-1 text-neutral-600">Bu sayfaya sadece yönetici hesapları erişebilir.</p>
      </>
    );
  } else {
    const ayarlar = await platformAyarlariGetir();

    // 2026-07-10'dan beri liste "esigi asanlar" degil "SU AN aktif rezervasyon
    // yasagi olanlar": eski liste motor kapisiyla tutarsizdi ("yeni rezervasyon
    // alamazlar" diyordu ama kapi iki-sartliydi). Yeni modelde yasak tek gercek
    // kaynak (Kullanici.rezervasyonYasagiBitisi) - seri dolunca otomatik yazilir,
    // suresi biten yasak kendiliginden duser (satir temizligi gerekmez).
    const simdi = new Date();
    const yasaklilar = await prisma.kullanici.findMany({
      where: { rezervasyonYasagiBitisi: { gt: simdi } },
      select: { id: true, ad: true, telefon: true, rezervasyonYasagiBitisi: true, guvenilirlikSifirlamaTarihi: true },
      orderBy: { rezervasyonYasagiBitisi: "asc" },
    });

    // Toplam (tum zamanlar) gelmedi sayisi: yasak baslarken seri sifirlandigi
    // icin "sifirlamadan beri" sayisi yasaklilarda hep 0 gorunur - admin'in
    // isine yarayan bilgi kisinin GECMIS toplami (tekrarlayan suclu mu?).
    const yasakliListe = await Promise.all(
      yasaklilar.map(async (k) => {
        const toplamGelmedi = await prisma.rezervasyon.count({
          where: { aliciId: k.id, durum: "gelmedi" },
        });
        return { ...k, toplamGelmedi };
      }),
    );

    icerik = (
      <>
        <h1 className="text-xl font-bold text-neutral-900">Güvenilirlik</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Üst üste {ayarlar.guvenilirlikEsigi} kez teslim almadığı için şu an rezervasyon yasağı
          {/* {expr} ile "gün" arasindaki duz bosluk Turbopack SSR'da yutuldu
              (ayni desen bir ust satirda calisiyor - nedeni cozulmedi);
              sayi+birim zaten ayrilmamasi gereken ikili, nbsp hem garantili
              hem dogru tipografi. */}
          olan alıcılar. Yasak süresi ({ayarlar.yasakSuresiGun}&nbsp;gün) dolunca kendiliğinden kalkar;
          &quot;Yasağı Kaldır&quot; erken affeder.{" "}
          <Link href="/admin/ayarlar" className="text-primary-600 hover:underline">
            Ayarları düzenle
          </Link>
        </p>
        <AdminNav aktif="guvenilirlik" />

        {yasakliListe.length === 0 ? (
          <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl bg-white p-8 text-center shadow-sm">
            <ShieldAlert className="h-8 w-8 text-neutral-300" strokeWidth={1.5} />
            <p className="text-neutral-500">Şu an rezervasyon yasağı olan kullanıcı yok.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {yasakliListe.map((k) => (
              <div key={k.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm">
                <div>
                  <Link href={`/admin/kullanicilar/${k.id}`} className="font-semibold text-primary-600 hover:underline">
                    {k.ad}
                  </Link>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {k.telefon ?? "—"} · yasak bitişi: {tarihFormat.format(k.rezervasyonYasagiBitisi!)} ·
                    toplam {k.toplamGelmedi} gelmedi
                  </p>
                </div>
                <GuvenilirlikSifirlaButonu kullaniciId={k.id} etiket="Yasağı Kaldır" />
              </div>
            ))}
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-6">{icerik}</main>
    </div>
  );
}
