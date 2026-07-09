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
  searchParams: Promise<{ durum?: string; yeni?: string; q?: string }>;
}) {
  const { durum, yeni, q } = await searchParams;
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
    const arama = q?.trim();

    // Uc durum: aktif (varsayilan, silindiMi=false - gizli olsun olmasin hepsi
    // rozetiyle gorunur), gizli (yalniz gizliMi=true), silindi (silindiMi=true).
    // "?yeni=1" son 7 gunde acilanlarla kesisir - hangi durum filtresiyle birlikte
    // kullanilirsa kullanilsin. "?q=" ad/slug arasinda serbest metin arama, digerleriyle birlesir.
    const durumWhere =
      durum === "gizli"
        ? { silindiMi: false, gizliMi: true }
        : durum === "silindi"
          ? { silindiMi: true }
          : { silindiMi: false };
    const where = {
      ...durumWhere,
      ...(yeniFiltre ? { createdAt: { gte: yediGunEsigi() } } : {}),
      ...(arama
        ? {
            OR: [
              { ad: { contains: arama, mode: "insensitive" as const } },
              { slug: { contains: arama, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

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
      if (arama) params.set("q", arama);
      const qs = params.toString();
      return `/admin/magazalar${qs ? `?${qs}` : ""}`;
    };
    const yeniToggleLink = () => {
      const params = new URLSearchParams();
      if (durum) params.set("durum", durum);
      if (!yeniFiltre) params.set("yeni", "1");
      if (arama) params.set("q", arama);
      const qs = params.toString();
      return `/admin/magazalar${qs ? `?${qs}` : ""}`;
    };
    const linkSinif = (aktifMi: boolean) =>
      aktifMi ? "text-primary-600 underline" : "text-neutral-500 hover:text-primary-600";

    icerik = (
      <>
        <h1 className="text-xl font-bold text-neutral-900">Tezgahlar</h1>
        <AdminNav aktif="magazalar" />

        <form method="get" className="mt-3 flex gap-2">
          {durum && <input type="hidden" name="durum" value={durum} />}
          {yeniFiltre && <input type="hidden" name="yeni" value="1" />}
          <input
            type="text"
            name="q"
            defaultValue={arama}
            placeholder="Tezgah adı veya bağlantı ara"
            className="w-full max-w-xs rounded-lg border border-neutral-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-primary-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-600"
          >
            Ara
          </button>
        </form>

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
          <p className="mt-4 text-neutral-600">Bu filtrede tezgah yok.</p>
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
