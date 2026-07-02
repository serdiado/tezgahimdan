import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSaticiSession } from "@/lib/yetki";
import { getOwnMagaza } from "@/lib/magaza";
import { SiteHeader } from "@/components/SiteHeader";
import { KuyrukKarti } from "./KuyrukKarti";

export default async function RezervasyonlarSayfasi() {
  const { session, yetkili } = await getSaticiSession();
  if (!session) {
    redirect("/giris");
  }
  if (!yetkili) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <SiteHeader />
        <main className="mx-auto max-w-2xl px-4 py-6">
          <h1 className="text-xl font-bold text-neutral-900">Yetkisiz Erişim</h1>
          <p className="mt-1 text-neutral-600">Bu sayfaya sadece satıcı hesapları erişebilir.</p>
        </main>
      </div>
    );
  }

  const magaza = await getOwnMagaza(session.user.id);

  // Yetki sinifi: SADECE bu saticinin kendi magazasinin urunleri ve onlarin
  // rezervasyonlari cekilir - baska magazanin verisine erisim yok. Bekleyen VE
  // sonuclanan (satildi/gelmedi/iptal) kayitlarin hepsi cekilir; "hicbir kayit
  // silinmez" ilkesi geregi sonuclananlar da ekranda gorunur.
  const urunler = magaza
    ? await prisma.urun.findMany({
        where: { magazaId: magaza.id, silindiMi: false },
        include: {
          rezervasyonlar: {
            include: { alici: { select: { ad: true, telefon: true } } },
            orderBy: [{ tip: "asc" }, { siraNo: "asc" }],
          },
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <div className="min-h-screen bg-neutral-50">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="text-xl font-bold text-neutral-900">Gelen Rezervasyonlar</h1>
        {!magaza ? (
          <p className="mt-2 text-neutral-600">Henüz mağazanız yok.</p>
        ) : urunler.length === 0 ? (
          <p className="mt-2 text-neutral-600">Henüz ürününüz yok.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {urunler.map((urun) => {
              const bekleyenler = urun.rezervasyonlar.filter((r) => r.durum === "bekliyor");
              // Sonuclananlar en son sonuclanandan eskiye; siraNo artik anlamsiz
              // oldugu icin createdAt'e gore siralanir.
              const sonuclananlar = urun.rezervasyonlar
                .filter((r) => r.durum !== "bekliyor")
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
              return (
                <KuyrukKarti
                  key={urun.id}
                  urun={{
                    id: urun.id,
                    baslik: urun.baslik,
                    durum: urun.durum,
                    stokAdedi: urun.stokAdedi,
                    satildiSayisi: urun.rezervasyonlar.filter((r) => r.durum === "satildi").length,
                    kuyruk: bekleyenler.map((r) => ({
                      id: r.id,
                      tip: r.tip,
                      siraNo: r.siraNo,
                      rezervKodu: r.rezervKodu,
                      aliciAd: r.alici.ad,
                      aliciTelefon: r.alici.telefon,
                    })),
                    sonuclananlar: sonuclananlar.map((r) => ({
                      id: r.id,
                      durum: r.durum,
                      rezervKodu: r.rezervKodu,
                      aliciAd: r.alici.ad,
                      aliciTelefon: r.alici.telefon,
                    })),
                  }}
                />
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
