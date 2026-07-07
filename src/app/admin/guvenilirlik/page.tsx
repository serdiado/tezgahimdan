import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { getAdminSession } from "@/lib/yetki";
import { prisma } from "@/lib/prisma";
import { GUVENILIRLIK_ESIGI } from "@/lib/rezervasyon";
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
    // Once ham "gelmedi" sayisi GUVENILIRLIK_ESIGI'ni asan adaylari bul (tek
    // groupBy), sonra HERKES icin ayri ayri (varsa) sifirlama tarihinden
    // SONRAKI sayimi hesapla - motordaki (rezervasyonOlustur) mantikla birebir
    // ayni, cunku kullanici basina sifirlama tarihi farkli olabilir (tek bir
    // SQL sorgusunda ifade edilemez, N kucuk oldugu icin sorun degil).
    const adaylar = await prisma.rezervasyon.groupBy({
      by: ["aliciId"],
      where: { durum: "gelmedi" },
      _count: true,
    });
    const adayIdler = adaylar.filter((a) => a._count >= GUVENILIRLIK_ESIGI).map((a) => a.aliciId);

    const kullanicilar = await prisma.kullanici.findMany({
      where: { id: { in: adayIdler } },
      select: { id: true, ad: true, telefon: true, guvenilirlikSifirlamaTarihi: true },
    });

    const kisitliListe = (
      await Promise.all(
        kullanicilar.map(async (k) => {
          const gelmediSayisi = await prisma.rezervasyon.count({
            where: {
              aliciId: k.id,
              durum: "gelmedi",
              ...(k.guvenilirlikSifirlamaTarihi ? { createdAt: { gt: k.guvenilirlikSifirlamaTarihi } } : {}),
            },
          });
          return { ...k, gelmediSayisi };
        }),
      )
    )
      .filter((k) => k.gelmediSayisi >= GUVENILIRLIK_ESIGI)
      .sort((a, b) => b.gelmediSayisi - a.gelmediSayisi);

    icerik = (
      <>
        <h1 className="text-xl font-bold text-neutral-900">Güvenilirlik</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {GUVENILIRLIK_ESIGI}+ &quot;gelmedi&quot; biriktiren kullanıcılar — halihazırda aktif bir
          rezervasyonu varken yeni rezervasyon alamazlar.
        </p>
        <AdminNav aktif="guvenilirlik" />

        {kisitliListe.length === 0 ? (
          <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl bg-white p-8 text-center shadow-sm">
            <ShieldAlert className="h-8 w-8 text-neutral-300" strokeWidth={1.5} />
            <p className="text-neutral-500">Şu an kısıtlanmış kullanıcı yok.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {kisitliListe.map((k) => (
              <div key={k.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm">
                <div>
                  <Link href={`/admin/kullanicilar/${k.id}`} className="font-semibold text-primary-600 hover:underline">
                    {k.ad}
                  </Link>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {k.telefon ?? "—"} · {k.gelmediSayisi} gelmedi
                    {k.guvenilirlikSifirlamaTarihi && ` · son sıfırlama: ${tarihFormat.format(k.guvenilirlikSifirlamaTarihi)}`}
                  </p>
                </div>
                <GuvenilirlikSifirlaButonu kullaniciId={k.id} />
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
