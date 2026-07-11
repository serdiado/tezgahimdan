import Link from "next/link";
import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { oturumRolOku } from "@/lib/yetki";
import { begeniSayilariHaritasi, enCokBegenilenUrunIdleriGetir, kullaniciFavoriHaritasi } from "@/lib/favori";
import { benimRezervasyonlarimHaritasi, kuyrukSayilariHaritasi, pasifUrunIdSeti } from "@/lib/rezervasyon";
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
import { VitrinArama } from "./VitrinArama";

const VARSAYILAN_URUN_LIMIT = 12;
const tarihFormat = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" });

const HERO_ANAHTARLARI = [
  "anasayfa_hero_baslik",
  "anasayfa_hero_aciklama",
  "anasayfa_hero_cta_metni",
  "anasayfa_hero_cta_link",
  "anasayfa_hero_gorsel",
];

// Gorunurluk filtresi "Bu Hafta Eklenenler" VE "En Cok Begenilenler"
// sorgularinin ikisinde de BIREBIR ayni (silindiMi/durum/magaza.silindiMi/
// magaza.gizliMi) kullanilir - tek yerde tutulur. "arama" (VitrinArama /
// HaftalikRitim'in ?q= parametresi) verilmisse magazanin pazarina gore de
// filtreler - anasayfadaki ürün-mağaza filtrelemesi TUTARLI kalsin diye
// magazalar sorgusuyla (page.tsx asagida) AYNI OR kosulunu kullanir.
function vitrinGorunurlukFiltresi(arama: string): Prisma.UrunWhereInput {
  return {
    silindiMi: false,
    durum: { in: ["sergide", "doldu"] },
    magaza: {
      silindiMi: false,
      gizliMi: false,
      ...(arama
        ? {
            pazar: {
              OR: [
                { il: { contains: arama, mode: "insensitive" } },
                { ilce: { contains: arama, mode: "insensitive" } },
                { semt: { contains: arama, mode: "insensitive" } },
              ],
            },
          }
        : {}),
    },
  };
}

type ModulAyarlari = { kolonSayisi?: 3 | 4; sunumTipi?: "grid" | "slider"; ogeSayisi?: number };

export default async function AnaSayfa({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const arama = q?.trim() || "";
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
      // gizledigi/kaldirdigi magaza ana sayfada sizar. Ayrica pazar.aktifMi=false ise
      // (pazar gecici/kalici kapali) o pazara bagli magazalar da vitrinden dusurulur.
      // "q" (VitrinArama'dan) verilmisse pazarin il/ilce/semt alanlarinda arar -
      // magaza adinda degil, bu arama sadece "hangi sehirde pazar var" sorusuna cevap verir.
      where: {
        silindiMi: false,
        gizliMi: false,
        pazar: {
          aktifMi: true,
          ...(arama
            ? {
                OR: [
                  { il: { contains: arama, mode: "insensitive" } },
                  { ilce: { contains: arama, mode: "insensitive" } },
                  { semt: { contains: arama, mode: "insensitive" } },
                ],
              }
            : {}),
        },
      },
      include: {
        pazar: { select: { ad: true, slug: true } },
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
      where: vitrinGorunurlukFiltresi(arama),
      include: {
        kategori: true,
        magaza: { select: { id: true, ad: true, slug: true } },
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
      where: { id: { in: enCokBegenilenIdler }, ...vitrinGorunurlukFiltresi(arama) },
      include: { kategori: true, magaza: { select: { id: true, ad: true, slug: true } } },
    });
    const urunMap = new Map(bulunanlar.map((u) => [u.id, u]));
    enCokBegenilenler = enCokBegenilenIdler
      .map((id) => urunMap.get(id))
      .filter((u): u is NonNullable<typeof u> => !!u);
  }

  const tumUrunIdler = Array.from(
    new Set([...yeniUrunler.map((u) => u.id), ...enCokBegenilenler.map((u) => u.id)]),
  );
  // "Mağazalar" bölümündeki magazalar + "Bu Hafta Eklenenler"/"En Çok
  // Beğenilenler" ürünlerinin mağazaları TAM ÖRTÜŞMEYEBİLİR (ör. pazarı pasif
  // olmuş bir mağazanın ürünü teorik olarak burada görünebilir) - puan
  // haritasının HER İKİ kaynaktan gelen mağaza id'lerini de kapsaması gerekir.
  const tumMagazaIdler = Array.from(
    new Set([
      ...magazalar.map((m) => m.id),
      ...yeniUrunler.map((u) => u.magaza.id),
      ...enCokBegenilenler.map((u) => u.magaza.id),
    ]),
  );
  const [
    begeniSayilari,
    benimFavorilerim,
    kuyrukSayilari,
    benimRezervasyonlarim,
    degerlendirmeOzeti,
    yorumlar,
    magazaDegerlendirmeOzeti,
    pasifUrunIdler,
  ] = await Promise.all([
    begeniSayilariHaritasi(tumUrunIdler),
    kullaniciFavoriHaritasi(session?.user?.id, tumUrunIdler),
    kuyrukSayilariHaritasi(tumUrunIdler),
    benimRezervasyonlarimHaritasi(session?.user?.id, tumUrunIdler),
    degerlendirmeOzetiHaritasi(tumUrunIdler),
    urunYorumlariHaritasi(tumUrunIdler),
    magazaDegerlendirmeOzetiHaritasi(tumMagazaIdler),
    // Capraz-magaza vitrin oldugu icin magazaId scope'suz (global) cagrilir.
    pasifUrunIdSeti(),
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
      kategori: { id: urun.kategori.id, ad: urun.kategori.ad, sira: urun.kategori.sira },
      magaza: {
        ad: urun.magaza.ad,
        slug: urun.magaza.slug,
        degerlendirmeOrtalamasi: magazaDegerlendirmeOzeti.get(urun.magaza.id)?.ortalama ?? null,
        degerlendirmeSayisi: magazaDegerlendirmeOzeti.get(urun.magaza.id)?.sayi ?? 0,
      },
      begeniSayisi: begeniSayilari.get(urun.id) ?? 0,
      benimBegenimVar: benimFavorilerim.get(urun.id)?.begeniMi ?? false,
      benimTakibimVar: benimFavorilerim.get(urun.id)?.takipMi ?? false,
      stokAdedi: urun.stokAdedi,
      aktifSayisi: kuyrukSayilari.get(urun.id)?.aktif ?? 0,
      yedekSayisi: kuyrukSayilari.get(urun.id)?.yedek ?? 0,
      benimRezervasyonum: benimRezervasyonlarim.get(urun.id) ?? null,
      beklemedeMi: pasifUrunIdler.has(urun.id),
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

  // "Bugünün Pazarları" bandı (haftalik_ritim) gerçek Hero olmasa da gorsel
  // olarak sayfanin en ust/dikkat-cekici bandi - arama cubugu bilincli olarak
  // bunun HEMEN ALTINA (varsa) yerlestiriliyor, geri kalan moduller (yeni
  // urunler/en cok begenilen/magaza listesi) admin sirasina gore ondan SONRA
  // gelmeye devam ediyor.
  const haftalikRitimAktifMi = moduller.some((m) => m.tur === "haftalik_ritim" && m.aktifMi);
  const digerModuller = moduller.filter((m) => m.aktifMi && m.tur !== "haftalik_ritim");

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
              slug: pazar.slug,
              ilce: pazar.ilce,
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
          (arama || yeniUrunler.length > 0) && (
            <div key={tur} className="mt-8">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-bold text-neutral-900">Bu Hafta Eklenenler</h2>
                {arama && (
                  <p className="text-sm text-neutral-500">
                    &quot;{arama}&quot; için {yeniUrunler.length} sonuç ·{" "}
                    <Link href="/" className="font-medium text-primary-600 hover:underline">
                      Temizle
                    </Link>
                  </p>
                )}
              </div>
              <div className="mt-4">
                {arama && yeniUrunler.length === 0 ? (
                  <p className="text-neutral-500">
                    &quot;{arama}&quot; bölgesinde bu hafta eklenmiş ürün yok.
                  </p>
                ) : (
                  <YeniEklenenler
                    girisli={girisli}
                    kullaniciTelefonVar={kullaniciTelefonVar}
                    urunler={yeniUrunler.map(urunKartiVeriYap)}
                    kolonSayisi={yeniUrunAyarlari.kolonSayisi ?? 3}
                    sunumTipi={yeniUrunAyarlari.sunumTipi ?? "grid"}
                  />
                )}
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
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-bold text-neutral-900">Tezgahlar</h2>
              {arama && (
                <p className="text-sm text-neutral-500">
                  &quot;{arama}&quot; için {magazalar.length} sonuç ·{" "}
                  <Link href="/" className="font-medium text-primary-600 hover:underline">
                    Temizle
                  </Link>
                </p>
              )}
            </div>
            <div className="mt-4">
              {arama && magazalar.length === 0 ? (
                <p className="text-neutral-500">
                  &quot;{arama}&quot; bölgesinde henüz tezgah yok. Farklı bir il/ilçe deneyin.
                </p>
              ) : (
                <MagazaVitrini
                  kolonSayisi={magazaListesiAyarlari.kolonSayisi ?? 3}
                  magazalar={magazalar.map((magaza) => ({
                    id: magaza.id,
                    ad: magaza.ad,
                    slug: magaza.slug,
                    aciklama: magaza.aciklama,
                    pazarAd: magaza.pazar.ad,
                    pazarSlug: magaza.pazar.slug,
                    urunSayisi: magaza._count.urunler,
                    degerlendirmeOrtalamasi: magazaDegerlendirmeOzeti.get(magaza.id)?.ortalama ?? null,
                    degerlendirmeSayisi: magazaDegerlendirmeOzeti.get(magaza.id)?.sayi ?? 0,
                  }))}
                />
              )}
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

        {haftalikRitimAktifMi && (
          <div className={heroGosterilsinMi ? "mt-4" : ""}>{modulRenderEt("haftalik_ritim")}</div>
        )}

        <div className={heroGosterilsinMi || haftalikRitimAktifMi ? "mt-6" : ""}>
          <VitrinArama
            pazarlar={pazarlar.map((p) => ({ id: p.id, il: p.il, ilce: p.ilce, semt: p.semt }))}
            baslangicSorgu={arama}
          />
        </div>

        {digerModuller.map((m) => modulRenderEt(m.tur))}

        {!satici && !admin && <MagazaAcCTA girisli={girisli} />}
      </main>
      <SiteFooter />
    </div>
  );
}
