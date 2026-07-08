import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { oturumRolOku } from "@/lib/yetki";
import { begeniSayilariHaritasi, enCokBegenilenUrunIdleriGetir, kullaniciFavoriHaritasi } from "@/lib/favori";
import { benimRezervasyonlarimHaritasi, kuyrukSayilariHaritasi } from "@/lib/rezervasyon";
import { degerlendirmeOzetiHaritasi, urunYorumlariHaritasi } from "@/lib/degerlendirme";
import { magazaDegerlendirmeOzetiHaritasi } from "@/lib/magaza-degerlendirme";
import { sayfaModulleriGetir } from "@/lib/sayfa-modulu";
import { siteIcerikHaritasiGetir } from "@/lib/site-icerik";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AnasayfaHero } from "./AnasayfaHero";
import { HaftalikRitim } from "./HaftalikRitim";
import { YeniEklenenler } from "./YeniEklenenler";
import { MagazaVitrini } from "./MagazaVitrini";
import { MagazaAcCTA } from "./MagazaAcCTA";

const VARSAYILAN_URUN_LIMIT = 12;
const tarihFormat = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" });

const HERO_ANAHTARLARI = [
  "anasayfa_hero_baslik",
  "anasayfa_hero_aciklama",
  "anasayfa_hero_cta_metni",
  "anasayfa_hero_cta_link",
  "anasayfa_hero_gorsel",
];

// Gorunurluk filtresi "Bu Hafta Eklenenler" sorgusuyla BIREBIR ayni
// (silindiMi/durum/magaza.silindiMi/magaza.gizliMi) - iki farkli sorgunun
// (createdAt-sirali vs begeni-sirali) ayni vitrin kurallarina uymasi icin
// tek yerde tutulur.
const VITRIN_GORUNURLUK_FILTRESI: Prisma.UrunWhereInput = {
  silindiMi: false,
  durum: { in: ["sergide", "doldu"] },
  magaza: { silindiMi: false, gizliMi: false },
};

type ModulAyarlari = { kolonSayisi?: 3 | 4; sunumTipi?: "grid" | "slider"; ogeSayisi?: number };

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

  // Faz 4 (CMS): sayfa duzeni admin tarafindan yonetilir - moduller.find ile
  // her turun sira/aktifMi/ayarlarina erisilir, asagida hem sorgu limitlerini
  // (ogeSayisi) hem render sirasini/gorunurlugunu belirlemek icin kullanilir.
  const [moduller, hero, pazarlar, magazalar] = await Promise.all([
    sayfaModulleriGetir("anasayfa"),
    siteIcerikHaritasiGetir(HERO_ANAHTARLARI),
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

  const modulHaritasi = new Map(moduller.map((m) => [m.tur, m]));
  const yeniUrunlerModul = modulHaritasi.get("yeni_urunler");
  const enCokBegenilenModul = modulHaritasi.get("en_cok_begenilen");
  const magazaListesiModul = modulHaritasi.get("magaza_listesi");
  const yeniUrunAyarlari = (yeniUrunlerModul?.ayarlar ?? {}) as ModulAyarlari;
  const enCokBegenilenAyarlari = (enCokBegenilenModul?.ayarlar ?? {}) as ModulAyarlari;
  const magazaListesiAyarlari = (magazaListesiModul?.ayarlar ?? {}) as ModulAyarlari;

  const [yeniUrunler, enCokBegenilenIdler] = await Promise.all([
    // Magazalar-arasi "Bu Hafta Eklenenler" seridi - MagazaVitrini'deki ayni
    // gizliMi/silindiMi kurali burada da gecerli, yoksa gizlenmis/kaldirilmis
    // bir magazanin urunu ana sayfada sizar.
    prisma.urun.findMany({
      where: VITRIN_GORUNURLUK_FILTRESI,
      include: {
        kategori: true,
        magaza: { select: { ad: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      take: yeniUrunAyarlari.ogeSayisi ?? VARSAYILAN_URUN_LIMIT,
    }),
    // Sadece begeni-sirali ID listesi - gorunurluk filtresi UYGULANMAZ (bkz.
    // src/lib/favori.ts), asagida ayri bir sorguyla uygulanir.
    enCokBegenilenUrunIdleriGetir(enCokBegenilenAyarlari.ogeSayisi ?? VARSAYILAN_URUN_LIMIT),
  ]);

  // Iki asamali: once begeni-sirali ID'ler, sonra o ID'lerle gorunurluk
  // filtreli Urun.findMany. findMany({id:{in:...}}) sira garantisi VERMEZ -
  // donen satirlar Map'e konup orijinal begeni-sirasina gore geri dizilir
  // (kuyrukSayilariHaritasi/begeniSayilariHaritasi deseninin mantigi).
  let enCokBegenilenler: typeof yeniUrunler = [];
  if (enCokBegenilenIdler.length > 0) {
    const bulunanlar = await prisma.urun.findMany({
      where: { id: { in: enCokBegenilenIdler }, ...VITRIN_GORUNURLUK_FILTRESI },
      include: { kategori: true, magaza: { select: { ad: true, slug: true } } },
    });
    const urunMap = new Map(bulunanlar.map((u) => [u.id, u]));
    enCokBegenilenler = enCokBegenilenIdler
      .map((id) => urunMap.get(id))
      .filter((u): u is NonNullable<typeof u> => !!u);
  }

  const tumUrunIdler = Array.from(
    new Set([...yeniUrunler.map((u) => u.id), ...enCokBegenilenler.map((u) => u.id)]),
  );
  const [
    begeniSayilari,
    benimFavorilerim,
    kuyrukSayilari,
    benimRezervasyonlarim,
    degerlendirmeOzeti,
    yorumlar,
    magazaDegerlendirmeOzeti,
  ] = await Promise.all([
    begeniSayilariHaritasi(tumUrunIdler),
    kullaniciFavoriHaritasi(session?.user?.id, tumUrunIdler),
    kuyrukSayilariHaritasi(tumUrunIdler),
    benimRezervasyonlarimHaritasi(session?.user?.id, tumUrunIdler),
    degerlendirmeOzetiHaritasi(tumUrunIdler),
    urunYorumlariHaritasi(tumUrunIdler),
    magazaDegerlendirmeOzetiHaritasi(magazalar.map((m) => m.id)),
  ]);

  // Hem "Bu Hafta Eklenenler" hem "En Cok Begenilenler" AYNI YeniUrunVeri
  // seklini kurar - kod tekrari yerine tek yardimci.
  function urunKartiVeriYap(urun: (typeof yeniUrunler)[number]) {
    return {
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
      benimRezervasyonum: benimRezervasyonlarim.get(urun.id) ?? null,
      degerlendirmeOrtalamasi: degerlendirmeOzeti.get(urun.id)?.ortalama ?? null,
      degerlendirmeSayisi: degerlendirmeOzeti.get(urun.id)?.sayi ?? 0,
      yorumlar: (yorumlar.get(urun.id) ?? []).map((y) => ({
        id: y.id,
        kullaniciAd: y.kullaniciAd,
        puan: y.puan,
        yorum: y.yorum,
        tarih: tarihFormat.format(y.createdAt),
      })),
    };
  }

  const heroBaslik = hero.get("anasayfa_hero_baslik") ?? "";
  const heroAciklama = hero.get("anasayfa_hero_aciklama") ?? "";
  const heroGorseli = hero.get("anasayfa_hero_gorsel") ?? null;
  const heroGosterilsinMi = !!(heroBaslik || heroAciklama || heroGorseli);

  // Modul render fonksiyonlari - moduller.map() ile sira admin ayarina gore
  // gecilir, aktifMi false olanlar hic render edilmez.
  function modulRenderEt(tur: (typeof moduller)[number]["tur"]) {
    switch (tur) {
      case "haftalik_ritim":
        return (
          <HaftalikRitim
            key={tur}
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
        );
      case "yeni_urunler":
        return (
          yeniUrunler.length > 0 && (
            <div key={tur} className="mt-8">
              <h2 className="text-lg font-bold text-neutral-900">Bu Hafta Eklenenler</h2>
              <div className="mt-4">
                <YeniEklenenler
                  girisli={girisli}
                  kullaniciTelefonVar={kullaniciTelefonVar}
                  urunler={yeniUrunler.map(urunKartiVeriYap)}
                  kolonSayisi={yeniUrunAyarlari.kolonSayisi ?? 3}
                  sunumTipi={yeniUrunAyarlari.sunumTipi ?? "grid"}
                />
              </div>
            </div>
          )
        );
      case "en_cok_begenilen":
        return (
          enCokBegenilenler.length > 0 && (
            <div key={tur} className="mt-8">
              <h2 className="text-lg font-bold text-neutral-900">En Çok Beğenilenler</h2>
              <div className="mt-4">
                <YeniEklenenler
                  girisli={girisli}
                  kullaniciTelefonVar={kullaniciTelefonVar}
                  urunler={enCokBegenilenler.map(urunKartiVeriYap)}
                  kolonSayisi={enCokBegenilenAyarlari.kolonSayisi ?? 3}
                  sunumTipi={enCokBegenilenAyarlari.sunumTipi ?? "grid"}
                />
              </div>
            </div>
          )
        );
      case "magaza_listesi":
        return (
          <div key={tur} id="magazalar" className="mt-8 scroll-mt-6">
            <h2 className="text-lg font-bold text-neutral-900">Mağazalar</h2>
            <div className="mt-4">
              <MagazaVitrini
                kolonSayisi={magazaListesiAyarlari.kolonSayisi ?? 3}
                magazalar={magazalar.map((magaza) => ({
                  id: magaza.id,
                  ad: magaza.ad,
                  slug: magaza.slug,
                  aciklama: magaza.aciklama,
                  pazarAd: magaza.pazar.ad,
                  urunSayisi: magaza._count.urunler,
                  degerlendirmeOrtalamasi: magazaDegerlendirmeOzeti.get(magaza.id)?.ortalama ?? null,
                  degerlendirmeSayisi: magazaDegerlendirmeOzeti.get(magaza.id)?.sayi ?? 0,
                }))}
              />
            </div>
          </div>
        );
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-6">
        {heroGosterilsinMi && (
          <AnasayfaHero
            baslik={heroBaslik}
            aciklama={heroAciklama}
            ctaMetni={hero.get("anasayfa_hero_cta_metni") ?? ""}
            ctaLink={hero.get("anasayfa_hero_cta_link") ?? ""}
            gorselUrl={heroGorseli}
          />
        )}

        {moduller.filter((m) => m.aktifMi).map((m) => modulRenderEt(m.tur))}

        {!satici && !admin && <MagazaAcCTA girisli={girisli} />}
      </main>
      <SiteFooter />
    </div>
  );
}
