import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/yetki";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/SiteHeader";
import { AdminNav } from "../AdminNav";
import { MagazaKartAdmin } from "./MagazaKartAdmin";

const YEDI_GUN_MS = 7 * 24 * 60 * 60 * 1000;

// react-hooks/purity: Date.now() dogrudan bilesen govdesinde "impure call" olarak
// isaretleniyor (React Compiler kurali, async Server Component'i ayirt etmiyor).
// Yardimci fonksiyona tasimak yeterli - kural sadece bilesenin kendi govdesini tarar.
function yediGunEsigi(): Date {
  return new Date(Date.now() - YEDI_GUN_MS);
}

export default async function AdminMagazalarPage({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string; yeni?: string }>;
}) {
  const { durum, yeni } = await searchParams;
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
    const yeniFiltre = yeni === "1";

    // Uc durum: aktif (varsayilan, silindiMi=false - gizli olsun olmasin hepsi
    // rozetiyle gorunur), gizli (yalniz gizliMi=true), silindi (silindiMi=true).
    // "?yeni=1" son 7 gunde acilanlarla kesisir - hangi durum filtresiyle birlikte
    // kullanilirsa kullanilsin.
    const durumWhere =
      durum === "gizli"
        ? { silindiMi: false, gizliMi: true }
        : durum === "silindi"
          ? { silindiMi: true }
          : { silindiMi: false };
    const where = yeniFiltre ? { ...durumWhere, createdAt: { gte: yediGunEsigi() } } : durumWhere;

    const magazalar = await prisma.magaza.findMany({
      where,
      include: {
        sahip: { select: { ad: true } },
        pazar: { select: { ad: true } },
        _count: { select: { urunler: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const filtreLink = (yeniDurum?: string) => {
      const params = new URLSearchParams();
      if (yeniDurum) params.set("durum", yeniDurum);
      if (yeniFiltre) params.set("yeni", "1");
      const qs = params.toString();
      return `/admin/magazalar${qs ? `?${qs}` : ""}`;
    };
    const yeniToggleLink = () => {
      const params = new URLSearchParams();
      if (durum) params.set("durum", durum);
      if (!yeniFiltre) params.set("yeni", "1");
      const qs = params.toString();
      return `/admin/magazalar${qs ? `?${qs}` : ""}`;
    };
    const linkSinif = (aktifMi: boolean) =>
      aktifMi ? "text-primary-600 underline" : "text-neutral-500 hover:text-primary-600";

    icerik = (
      <>
        <h1 className="text-xl font-bold text-neutral-900">Mağazalar</h1>
        <AdminNav aktif="magazalar" />

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-medium">
          <Link href={filtreLink()} className={linkSinif(!durum)}>
            Tümü
          </Link>
          <span className="text-neutral-300">·</span>
          <Link href={filtreLink("gizli")} className={linkSinif(durum === "gizli")}>
            Gizli
          </Link>
          <span className="text-neutral-300">·</span>
          <Link href={filtreLink("silindi")} className={linkSinif(durum === "silindi")}>
            Silinmiş
          </Link>
          <span className="text-neutral-300">·</span>
          <Link href={yeniToggleLink()} className={linkSinif(yeniFiltre)}>
            Yalnızca yeni (7 gün)
          </Link>
        </div>

        {magazalar.length === 0 ? (
          <p className="mt-4 text-neutral-600">Bu filtrede mağaza yok.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {magazalar.map((m) => (
              <MagazaKartAdmin
                key={m.id}
                magaza={{
                  id: m.id,
                  ad: m.ad,
                  slug: m.slug,
                  sahipAd: m.sahip.ad,
                  pazarAd: m.pazar.ad,
                  gizliMi: m.gizliMi,
                  silindiMi: m.silindiMi,
                  urunSayisi: m._count.urunler,
                  olusturulmaTarihi: m.createdAt.toISOString(),
                }}
              />
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
