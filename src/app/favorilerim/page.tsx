import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/SiteHeader";
import { FavorilerimIcerik } from "./FavorilerimIcerik";

// /rezervasyonum ile ayni desen: girisli kullanicinin kendi listesi, girissiz
// login'e (donusle). Silinmis urunler listeden filtrelenir (favori kaydinin
// kendisi HIC silinmez - sadece goruntude gizlenir, CLAUDE.md soft-delete
// ilkesiyle tutarli).
export default async function FavorilerimSayfasi() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/giris?next=/favorilerim");
  }

  const favoriler = await prisma.urunFavori.findMany({
    where: {
      kullaniciId: session.user.id,
      OR: [{ begeniMi: true }, { takipMi: true }],
      urun: { silindiMi: false },
    },
    include: {
      urun: {
        select: {
          baslik: true,
          fiyat: true,
          durum: true,
          fotograflar: true,
          magaza: { select: { ad: true, slug: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-neutral-50">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-6">
        <h1 className="text-xl font-bold text-neutral-900">Favorilerim</h1>
        <FavorilerimIcerik
          favoriler={favoriler.map((f) => ({
            urunId: f.urunId,
            urunBaslik: f.urun.baslik,
            fiyat: Number(f.urun.fiyat),
            durum: f.urun.durum,
            fotograf: f.urun.fotograflar[0] ?? null,
            magazaAd: f.urun.magaza.ad,
            magazaSlug: f.urun.magaza.slug,
            begeniMi: f.begeniMi,
            takipMi: f.takipMi,
          }))}
        />
      </main>
    </div>
  );
}
