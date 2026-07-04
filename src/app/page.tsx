import { prisma } from "@/lib/prisma";
import { oturumRolOku } from "@/lib/yetki";
import { SiteHeader } from "@/components/SiteHeader";
import { HaftalikRitim } from "./HaftalikRitim";
import { MagazaVitrini } from "./MagazaVitrini";
import { MagazaAcCTA } from "./MagazaAcCTA";

export default async function AnaSayfa() {
  const { session, rol } = await oturumRolOku();
  const girisli = !!session?.user;
  const satici = rol === "satici";
  const admin = rol === "admin";

  const [pazarlar, magazalar] = await Promise.all([
    prisma.pazar.findMany({ where: { aktifMi: true }, orderBy: { createdAt: "asc" } }),
    prisma.magaza.findMany({
      // Ileri-referans notu (docs/mimari/satici-onboarding.md): herkese acik her
      // magaza listesi silindiMi=false AND gizliMi=false filtrelemeli, yoksa admin'in
      // gizledigi/kaldirdigi magaza ana sayfada sizar.
      where: { silindiMi: false, gizliMi: false },
      include: {
        pazar: { select: { ad: true } },
        _count: { select: { urunler: { where: { silindiMi: false } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="min-h-screen bg-neutral-50">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <HaftalikRitim pazarlar={pazarlar} />

        <div className="mt-8">
          <h2 className="text-lg font-bold text-neutral-900">Mağazalar</h2>
          <div className="mt-4">
            <MagazaVitrini
              magazalar={magazalar.map((magaza) => ({
                id: magaza.id,
                ad: magaza.ad,
                slug: magaza.slug,
                aciklama: magaza.aciklama,
                pazarAd: magaza.pazar.ad,
                urunSayisi: magaza._count.urunler,
              }))}
            />
          </div>
        </div>

        {!satici && !admin && <MagazaAcCTA girisli={girisli} />}
      </main>
    </div>
  );
}
