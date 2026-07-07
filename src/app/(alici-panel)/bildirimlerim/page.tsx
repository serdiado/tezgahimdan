import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { BildirimlerimIcerik } from "./BildirimlerimIcerik";

// /rezervasyonum ile ayni desen: girisli kullanicinin kendi listesi, girissiz
// login'e (donusle). Once mevcut haliyle okunur, SONRA okunmamislar
// okunduMu:true yapilir - boylece bu render "yeni gelen" bildirimleri hala
// vurgulu gosterir, header rozeti bir sonraki gorunumde sifirlanir.
export default async function BildirimlerimSayfasi() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/giris?next=/bildirimlerim");
  }

  const bildirimler = await prisma.bildirim.findMany({
    where: { kullaniciId: session.user.id },
    include: { urun: { select: { baslik: true, magaza: { select: { slug: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  await prisma.bildirim.updateMany({
    where: { kullaniciId: session.user.id, okunduMu: false },
    data: { okunduMu: true },
  });

  return (
    <>
      <h1 className="text-xl font-bold text-neutral-900">Bildirimlerim</h1>
      <BildirimlerimIcerik
        bildirimler={bildirimler.map((b) => ({
          id: b.id,
          mesaj: b.mesaj,
          createdAt: b.createdAt.toISOString(),
          yeniMi: !b.okunduMu,
          urunId: b.urunId,
          urunBaslik: b.urun.baslik,
          magazaSlug: b.urun.magaza.slug,
        }))}
      />
    </>
  );
}
