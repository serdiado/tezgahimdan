import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSaticiSession } from "@/lib/yetki";
import { getOwnMagaza } from "@/lib/magaza";
import { aliciGuvenilirlikHaritasi } from "@/lib/rezervasyon";
import { platformAyarlariGetir } from "@/lib/platform-ayarlari";
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

  // Bu magazadaki tum rezervasyonlarin alicilarini tekillestirip TEK sorguda
  // guvenilirlik (satildi/gelmedi) sayilarini cekiyoruz - satir basina ayri
  // sorgu yerine (PLAN.md SS3: "saticiya alicinin orani gosterilir").
  const aliciIdSeti = new Set<string>();
  for (const urun of urunler) {
    for (const r of urun.rezervasyonlar) aliciIdSeti.add(r.aliciId);
  }
  const [guvenilirlik, ayarlar] = await Promise.all([
    aliciGuvenilirlikHaritasi([...aliciIdSeti]),
    platformAyarlariGetir(),
  ]);
  // kisitliMi hesabini burada (gercek esikle) yapiyoruz - KuyrukKarti istemci
  // bileseni oldugu icin rezervasyon.ts'den (prisma/node:crypto ithal ediyor)
  // dogrudan sabit import edemez.
  function guvenilirlikOzeti(aliciId: string) {
    const veri = guvenilirlik.get(aliciId) ?? { satildi: 0, gelmedi: 0 };
    return { ...veri, kisitliMi: veri.gelmedi >= ayarlar.guvenilirlikEsigi };
  }

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
                      guvenilirlik: guvenilirlikOzeti(r.aliciId),
                    })),
                    sonuclananlar: sonuclananlar.map((r) => ({
                      id: r.id,
                      durum: r.durum,
                      rezervKodu: r.rezervKodu,
                      aliciAd: r.alici.ad,
                      aliciTelefon: r.alici.telefon,
                      guvenilirlik: guvenilirlikOzeti(r.aliciId),
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
