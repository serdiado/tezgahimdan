import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { oturumRolOku } from "@/lib/yetki";
import { begeniSayilariHaritasi, enCokBegenilenUrunIdleriGetir, kullaniciFavoriHaritasi } from "@/lib/favori";
import { benimRezervasyonlarimHaritasi, kuyrukSayilariHaritasi, pasifUrunIdSeti } from "@/lib/rezervasyon";
import { degerlendirmeOzetiHaritasi, urunYorumlariHaritasi } from "@/lib/degerlendirme";
import { magazaDegerlendirmeOzetiHaritasi } from "@/lib/magaza-degerlendirme";
import { sayfaModulleriGetir } from "@/lib/sayfa-modulu";
import { sayfaKes, sayfaNoCoz } from "@/lib/vitrin-sayfalama";
import { siteIcerikHaritasiGetir } from "@/lib/site-icerik";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { DahaFazlaButonu } from "@/components/DahaFazlaButonu";
import { AnasayfaHero } from "./AnasayfaHero";
import { HaftalikRitim } from "./HaftalikRitim";
import { PazarBaglamSatiri } from "./PazarBaglamSatiri";
import { YeniEklenenler } from "./YeniEklenenler";
import { MagazaVitrini } from "./MagazaVitrini";
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

// Gorunurluk filtresi "Yeni Urunler" VE "En Cok Begenilenler" sorgularinin
// ikisinde de (ayrica kategori cipleri sorgusunda) BIREBIR ayni kullanilir -
// tek yerde tutulur. "arama" (VitrinArama / HaftalikRitim'in ?q= parametresi)
// verilmisse magazanin pazarina gore de filtreler - anasayfadaki urun-magaza
// filtrelemesi TUTARLI kalsin diye magazalar sorgusuyla AYNI OR kosulunu kullanir.
//
// pazar.aktifMi KOSULSUZ (2026-07-15 hata duzeltmesi): eskiden pazar kosulu
// SADECE arama varken giriyordu, yani aramasiz ana sayfada pasif pazarin
// urunleri SIZIYORDU. Canli olculdu: admin pazari kapatinca tezgah kartlari
// kayboluyor (magazalar sorgusu aktifMi filtreliyor) ama 24 urun karti ana
// sayfada kaliyor ve REZERVE EDILEBILIYORDU - alici bosuna pazara giderdi,
// yani platformun onlemek icin var oldugu sey. Sema yorumu da bunun
// filtrelendigini soyluyordu (Pazar.aktifMi: "bagli magazalar vitrinde/
// anasayfada GORUNMEZ"), yani niyet ile kod ayrilmisti.
// DIKKAT: aktifMi ile arama OR'u AYNI `pazar` nesnesinde birlesmeli - iki ayri
// spread biri otekini ezerdi.
function vitrinGorunurlukFiltresi(arama: string, kategoriId?: string | null): Prisma.UrunWhereInput {
  return {
    silindiMi: false,
    durum: { in: ["sergide", "doldu"] },
    ...(kategoriId ? { kategoriId } : {}),
    magaza: {
      silindiMi: false,
      gizliMi: false,
      duraklatildiMi: false,
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
  };
}

type ModulAyarlari = { kolonSayisi?: 3 | 4; sunumTipi?: "grid" | "slider"; ogeSayisi?: number };

export default async function AnaSayfa({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sayfa?: string; kategori?: string }>;
}) {
  const { q, sayfa, kategori } = await searchParams;
  const arama = q?.trim() || "";
  const sayfaNo = sayfaNoCoz(sayfa);
  const secilenKategoriId = kategori?.trim() || null;
  const { session } = await oturumRolOku();
  const girisli = !!session?.user;

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
  const [moduller, hero, pazarlar] = await Promise.all([
    sayfaModulleriGetir("anasayfa"),
    siteIcerikHaritasiGetir(HERO_ANAHTARLARI),
    prisma.pazar.findMany({ where: { aktifMi: true }, orderBy: { createdAt: "asc" } }),
  ]);

  const modulHaritasi = new Map(moduller.map((m) => [m.tur, m]));
  const yeniUrunlerModul = modulHaritasi.get("yeni_urunler");
  const enCokBegenilenModul = modulHaritasi.get("en_cok_begenilen");
  const magazaListesiModul = modulHaritasi.get("magaza_listesi");
  const yeniUrunAyarlari = (yeniUrunlerModul?.ayarlar ?? {}) as ModulAyarlari;
  const enCokBegenilenAyarlari = (enCokBegenilenModul?.ayarlar ?? {}) as ModulAyarlari;
  const magazaListesiAyarlari = (magazaListesiModul?.ayarlar ?? {}) as ModulAyarlari;

  // Sayfa boyu admin panelinden (SayfaModulu.ayarlar.ogeSayisi, 4-24).
  // "Daha Fazla" take'i BIRIKTIREREK buyutur (skip DEGIL): vitrin gezinmesinde
  // kullaniciya ilk 12'yi kaybettirmek yanlis olur - listeye ekleniyor.
  const yeniUrunSayfaBoyu = yeniUrunAyarlari.ogeSayisi ?? VARSAYILAN_URUN_LIMIT;
  const yeniUrunLimit = yeniUrunSayfaBoyu * sayfaNo;
  const magazaSayfaBoyu = magazaListesiAyarlari.ogeSayisi ?? VARSAYILAN_URUN_LIMIT;

  const [yeniUrunlerHam, enCokBegenilenIdler, magazalar, yeniUrunToplam, kategoriCipleri] = await Promise.all([
    // Magazalar-arasi "Yeni Ürünler" seridi - MagazaVitrini'deki ayni
    // gizliMi/silindiMi kurali burada da gecerli, yoksa gizlenmis/kaldirilmis
    // bir magazanin urunu ana sayfada sizar.
    prisma.urun.findMany({
      where: vitrinGorunurlukFiltresi(arama, secilenKategoriId),
      include: {
        kategori: true,
        magaza: { select: { id: true, ad: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      // +1: "daha var mi" sorusunu EK SORGU OLMADAN cevaplar. count() yerine
      // bir satir fazla okunur. Fazladan satir asagida slice ile atilir -
      // haritalara SOKULMAMALI, yoksa gosterilmeyen urunun yorumlari/fotolari
      // bosuna cekilip payload'a girer.
      take: yeniUrunLimit + 1,
    }),
    // Sadece begeni-sirali ID listesi - gorunurluk filtresi UYGULANMAZ (bkz.
    // src/lib/favori.ts), asagida ayri bir sorguyla uygulanir.
    enCokBegenilenUrunIdleriGetir(enCokBegenilenAyarlari.ogeSayisi ?? VARSAYILAN_URUN_LIMIT),
    // 2026-07-14: ana sayfada TUM magazalar degil, sinirli bir "en yeni
    // tezgahlar" ONIZLEMESI (slider). Tam liste 2026-07-15'e kadar
    // /magazalar'daydi; o route kaldirildi - tam liste artik PAZARIN kendi
    // sayfasinda ("Bu Pazardaki Tezgahlar", bkz. asagidaki link ve
    // docs/mimari/anasayfa-kapsam-ekseni.md). magazaListesiAyarlari, moduller
    // cozulmeden bu Promise.all'a giremeyecegi icin sorgu BILEREK burada
    // (yeniUrunler/enCokBegenilenIdler ile AYNI asamada) - yeniUrunAyarlari
    // ile ayni desen.
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
        duraklatildiMi: false,
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
      // Arama aktifken limit UYGULANMAZ: kullanici belirli bir bolge ariyorsa
      // (ör. "Izmir") zaten dar bir kume donuyor, kesip "X sonuc" yazisini
      // yanlis/eksik gostermek yanlis olur - tum eslesenler slider'da kaydirilir.
      // NOT: ana sayfadaki bu SLIDER sayfalanmaz (bilincli) - "Bu Pazardaki Tum
      // Tezgahlar" linki pazarin sayfasina goturur, tam liste orada. Yani
      // magaza_listesi.ogeSayisi artik SADECE "onizleme uzunlugu" demek.
      take: arama ? undefined : magazaSayfaBoyu,
    }),
    // "N sonuc" etiketi icin GERCEK toplam - sadece arama varken. Onceden
    // yeniUrunler.length yazılıyordu, yani take ile kesilmis pencere: 30
    // eslesmede "12 sonuc" diyordu. "sonuc" kelimesi toplam vaat ediyor.
    arama ? prisma.urun.count({ where: vitrinGorunurlukFiltresi(arama, secilenKategoriId) }) : Promise.resolve(0),
    // Cipler YUKLENEN urunlerden degil, gorunur urunu OLAN tum kategorilerden
    // (bkz. YeniEklenenler.tsx basindaki gerekce). Kategori 7 satir, ucuz.
    prisma.kategori.findMany({
      where: { silindiMi: false, urunler: { some: vitrinGorunurlukFiltresi(arama) } },
      orderBy: [{ sira: "asc" }, { ad: "asc" }],
      select: { id: true, ad: true, sira: true },
    }),
  ]);

  // +1'inci satiri AT ve "daha var mi"yi ondan turet. Kesme, haritalar
  // kurulmadan ONCE olmali (bkz. sayfaKes yorumu).
  const { ogeler: yeniUrunler, dahaVarMi: yeniUrunDahaVarMi } = sayfaKes(yeniUrunlerHam, yeniUrunLimit);

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
  // "Mağazalar" bölümündeki magazalar + "Yeni Ürünler"/"En Çok
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

  // URL uretici: mevcut parametreleri KORUYARAK tek birini degistirir
  // (ör. kategori degisince arama kaybolmamali).
  function anasayfaHref(degisiklik: { kategori?: string | null; sayfa?: number }) {
    const p = new URLSearchParams();
    if (arama) p.set("q", arama);
    const yeniKategori = degisiklik.kategori !== undefined ? degisiklik.kategori : secilenKategoriId;
    if (yeniKategori) p.set("kategori", yeniKategori);
    const yeniSayfa = degisiklik.sayfa ?? sayfaNo;
    if (yeniSayfa > 1) p.set("sayfa", String(yeniSayfa));
    const qs = p.toString();
    return qs ? `/?${qs}` : "/";
  }
  // Kategori degisince sayfa 1'e DONER - yoksa "sayfa 3'teyim ama bu
  // kategoride 1 sayfa var" bosluğu cikar.
  const anasayfaKategoriHref = (kategoriId: string | null) => anasayfaHref({ kategori: kategoriId, sayfa: 1 });
  const anasayfaSayfaHref = (yeniSayfa: number) => anasayfaHref({ sayfa: yeniSayfa });

  // Hem "Yeni Ürünler" hem "En Cok Begenilenler" AYNI YeniUrunVeri
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

  // Baglam satiri: SADECE tek aktif pazar varken. Iki pazar olunca "asagidaki
  // her sey bu pazardan" cumlesi YALAN olur - satir kendiliginden kaybolur
  // (bkz. PazarBaglamSatiri.tsx). Sira admin'den degistirilebildigi icin satir
  // sabit bir konuma degil, ILK KAPSAMLI MODULUN hemen ustune basilir:
  // haftalik_ritim caprazdir ve urun GOSTERMEZ, o yuzden kapsam disi.
  const tekPazar = pazarlar.length === 1 ? pazarlar[0] : null;
  const ilkKapsamliModul = digerModuller[0]?.tur ?? null;

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
          (arama || secilenKategoriId || yeniUrunler.length > 0) && (
            <div key={tur} className="mt-8">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                {/*
                  "Yeni Ürünler" (2026-07-15) - eskiden "Yeni Ürünler"di ama
                  sorgu HAFTA FILTRELEMIYOR (sadece orderBy createdAt desc + take),
                  yani isim yalan soyluyordu. Gercekten hafta filtrelemek REDDEDILDI:
                  37 urunluk envanterde bolum cogu hafta bosalirdi. Ayrica bu bolum
                  "Daha Fazla Goster" ile TUM urunlere ulasan tek yer - alt kume adi
                  tasimasi kullaniciyi "asil urunler nerede?" diye arattiriyordu.
                  Modul turu (yeni_urunler) zaten "hafta" demiyor, migration yok.
                */}
                <h2 className="text-lg font-bold text-neutral-900">Yeni Ürünler</h2>
                {arama && (
                  <p className="text-sm text-neutral-500">
                    &quot;{arama}&quot; için {yeniUrunToplam} sonuç ·{" "}
                    <Link href="/" className="font-medium text-primary-600 hover:underline">
                      Temizle
                    </Link>
                  </p>
                )}
              </div>
              <div className="mt-4">
                {arama && yeniUrunToplam === 0 ? (
                  <p className="text-neutral-500">
                    &quot;{arama}&quot; bölgesinde bu hafta eklenmiş ürün yok.
                  </p>
                ) : (
                  <>
                    <YeniEklenenler
                      girisli={girisli}
                      kullaniciTelefonVar={kullaniciTelefonVar}
                      urunler={yeniUrunler.map(urunKartiVeriYap)}
                      kategoriler={kategoriCipleri}
                      secilenKategoriId={secilenKategoriId}
                      kategoriHrefUret={anasayfaKategoriHref}
                      kolonSayisi={yeniUrunAyarlari.kolonSayisi ?? 3}
                      sunumTipi={yeniUrunAyarlari.sunumTipi ?? "grid"}
                    />
                    {yeniUrunDahaVarMi && (
                      <DahaFazlaButonu href={anasayfaSayfaHref(sayfaNo + 1)} />
                    )}
                    {/*
                      Urunlere bir EV veriyor. Kullanicinin "urunler yok"
                      gozleminin ikinci yarisi buydu: Tezgahlar'in /magazalar'i
                      var, urunlerin gidilecek yeri yoktu. YENI SAYFA ACILMADI -
                      /pazar/[slug] zaten tam olarak o is: o pazarin tum
                      urunleri + kategori cipleri + sayfalama + pazar-ici arama.
                      Baglam satiriyla AYNI kosul: tek pazar yoksa "bu pazar"
                      ifadesi anlamsiz (coklu pazarda link "Pazarlar"a doner).
                    */}
                    {tekPazar && (
                      <p className="mt-4 text-center text-sm">
                        <Link
                          href={`/pazar/${tekPazar.slug}`}
                          className="font-medium text-primary-600 hover:underline"
                        >
                          Bu Pazardaki Tüm Ürünler →
                        </Link>
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        );
      case "en_cok_begenilen":
        // "Daha Fazla" BILEREK YOK (2026-07-15 karari): bu bolum tanimi geregi
        // bir top-N listesi ("en cok begenilen 12 urun") - sayfalamak anlamsiz.
        // Ayrica enCokBegenilenUrunIdleriGetir ID'leri gorunurluk filtresinden
        // ONCE cekiyor, o yuzden sayfalamasi yanlis sayi gosterirdi.
        // Kategori cipleri de burada gosterilmiyor: filtre sunucuda ve tek
        // parametreye (?kategori) bagli, iki ayri bolumde ayri secim olamaz -
        // sayfalanan tek liste "Yeni Ürünler".
        return (
          enCokBegenilenler.length > 0 && (
            <div key={tur} className="mt-8">
              <h2 className="text-lg font-bold text-neutral-900">En Çok Beğenilenler</h2>
              <div className="mt-4">
                <YeniEklenenler
                  girisli={girisli}
                  kullaniciTelefonVar={kullaniciTelefonVar}
                  urunler={enCokBegenilenler.map(urunKartiVeriYap)}
                  kategoriler={[]}
                  secilenKategoriId={null}
                  kategoriHrefUret={() => "/"}
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
                <>
                  <MagazaVitrini
                    sunumTipi="slider"
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
                  {/*
                    Hedef ARTIK /magazalar DEGIL, pazarin kendi sayfasi
                    (2026-07-15 kullanici karari, bkz. docs/mimari/anasayfa-kapsam-ekseni.md).
                    Gerekce: "tum tezgahlar" listesi olcekte birbirine karismis
                    yuzlerce tezgah demek - kimsenin isine yaramayan bir coplup.
                    Tezgah her zaman BIR pazarin baglaminda anlamli ("bu carsamba
                    su pazarda"), o yuzden dogru hedef o pazarin sayfasindaki
                    "Bu Pazardaki Tezgahlar" bolumu. /magazalar route'u kaldirildi.

                    tekPazar kosulu: coklu pazarda "bu pazar" ifadesi anlamsiz -
                    baglam satiri ve "Bu Pazardaki Tum Urunler" ile AYNI kural.
                    Arama aktifken de gizli: o durumda zaten TUM eslesenler
                    gosteriliyor (take yok), "tumunu gor" anlamsiz.
                  */}
                  {!arama && tekPazar && (
                    <Link
                      href={`/pazar/${tekPazar.slug}#tezgahlar`}
                      className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:underline"
                    >
                      Bu Pazardaki Tüm Tezgahlar
                      <ArrowRight className="h-4 w-4" strokeWidth={2} />
                    </Link>
                  )}
                </>
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

        {digerModuller.map((m) => (
          <div key={m.tur}>
            {tekPazar && m.tur === ilkKapsamliModul && (
              <PazarBaglamSatiri
                pazar={{
                  ad: tekPazar.ad,
                  slug: tekPazar.slug,
                  il: tekPazar.il,
                  ilce: tekPazar.ilce,
                  baslangicGunu: tekPazar.baslangicGunu,
                }}
              />
            )}
            {modulRenderEt(m.tur)}
          </div>
        ))}
      </main>
      <SiteFooter />
    </div>
  );
}
