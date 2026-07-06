import { prisma } from "@/lib/prisma";
import { oturumRolOku } from "@/lib/yetki";
import { begeniSayilariHaritasi, kullaniciFavoriHaritasi } from "@/lib/favori";
import { kuyrukSayilariHaritasi } from "@/lib/rezervasyon";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { HaftalikRitim } from "./HaftalikRitim";
import { YeniEklenenler } from "./YeniEklenenler";
import { MagazaVitrini } from "./MagazaVitrini";
import { MagazaAcCTA } from "./MagazaAcCTA";

const YENI_URUN_LIMIT = 12;

export default async function AnaSayfa() {
  const { session, rol } = await oturumRolOku();
  const girisli = !!session?.user;
  const satici = rol === "satici";
  const admin = rol === "admin";

  let kullaniciTelefonVar = false;
  if (session?.user?.id) {
    const kullanici = await prisma.kullanici.findUnique({
      where: { id: session.user.id },
      select: { telefon: true },
    });
    kullaniciTelefonVar = !!kullanici?.telefon;
  }

  const [pazarlar, magazalar, yeniUrunler] = await Promise.all([
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
    // Magazalar-arasi "Bu Hafta Eklenenler" seridi - MagazaVitrini'deki ayni
    // gizliMi/silindiMi kurali burada da gecerli, yoksa gizlenmis/kaldirilmis
    // bir magazanin urunu ana sayfada sizar.
    prisma.urun.findMany({
      where: {
        silindiMi: false,
        durum: { in: ["sergide", "doldu"] },
        magaza: { silindiMi: false, gizliMi: false },
      },
      include: {
        kategori: true,
        magaza: { select: { ad: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      take: YENI_URUN_LIMIT,
    }),
  ]);

  const yeniUrunIdler = yeniUrunler.map((u) => u.id);
  const [begeniSayilari, benimFavorilerim, kuyrukSayilari] = await Promise.all([
    begeniSayilariHaritasi(yeniUrunIdler),
    kullaniciFavoriHaritasi(session?.user?.id, yeniUrunIdler),
    kuyrukSayilariHaritasi(yeniUrunIdler),
  ]);

  return (
    <div className="min-h-screen bg-neutral-50">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <HaftalikRitim
          pazarlar={pazarlar.map((pazar) => ({
            id: pazar.id,
            bolge: pazar.bolge,
            baslangicGunu: pazar.baslangicGunu,
            baslangicSaati: pazar.baslangicSaati,
            sifirlamaGunu: pazar.sifirlamaGunu,
            sifirlamaSaati: pazar.sifirlamaSaati,
            saatDilimi: pazar.saatDilimi,
          }))}
        />

        {yeniUrunler.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-bold text-neutral-900">Bu Hafta Eklenenler</h2>
            <div className="mt-4">
              <YeniEklenenler
                girisli={girisli}
                kullaniciTelefonVar={kullaniciTelefonVar}
                urunler={yeniUrunler.map((urun) => ({
                  id: urun.id,
                  baslik: urun.baslik,
                  aciklama: urun.aciklama,
                  fiyat: Number(urun.fiyat),
                  durum: urun.durum,
                  fotograflar: urun.fotograflar,
                  kategori: { id: urun.kategori.id, ad: urun.kategori.ad },
                  magaza: { ad: urun.magaza.ad, slug: urun.magaza.slug },
                  begeniSayisi: begeniSayilari.get(urun.id) ?? 0,
                  benimBegenimVar: benimFavorilerim.get(urun.id)?.begeniMi ?? false,
                  benimTakibimVar: benimFavorilerim.get(urun.id)?.takipMi ?? false,
                  stokAdedi: urun.stokAdedi,
                  aktifSayisi: kuyrukSayilari.get(urun.id)?.aktif ?? 0,
                  yedekSayisi: kuyrukSayilari.get(urun.id)?.yedek ?? 0,
                }))}
              />
            </div>
          </div>
        )}

        <div id="magazalar" className="mt-8 scroll-mt-6">
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
      <SiteFooter />
    </div>
  );
}
