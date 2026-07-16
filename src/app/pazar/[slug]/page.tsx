import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, MapPin } from "lucide-react";
import { auth } from "@/auth";
import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { sayfaModulleriGetir } from "@/lib/sayfa-modulu";
import { sayfaKes, sayfaNoCoz } from "@/lib/vitrin-sayfalama";
import { begeniSayilariHaritasi, kullaniciFavoriHaritasi } from "@/lib/favori";
import { benimRezervasyonlarimHaritasi, kuyrukSayilariHaritasi, pasifUrunIdSeti } from "@/lib/rezervasyon";
import { degerlendirmeOzetiHaritasi, urunYorumlariHaritasi } from "@/lib/degerlendirme";
import { magazaDegerlendirmeOzetiHaritasi } from "@/lib/magaza-degerlendirme";
import { SiteHeader } from "@/components/SiteHeader";
import { DahaFazlaButonu } from "@/components/DahaFazlaButonu";
import { MagazaVitrini } from "@/app/MagazaVitrini";
import { YeniEklenenler } from "@/app/YeniEklenenler";
import { PazarIciArama } from "./PazarIciArama";

const tarihFormat = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" });

// Diger dosyalarin (MagazaHero.tsx, HaftalikRitim.tsx) yaptigi gibi gun
// etiketleri yerelde tutulur - ortak modul cikarmak icin 3+ kullanim bekleniyor.
const GUN_ETIKETI: Record<string, string> = {
  Pazartesi: "Pazartesi",
  Sali: "Salı",
  Carsamba: "Çarşamba",
  Persembe: "Perşembe",
  Cuma: "Cuma",
  Cumartesi: "Cumartesi",
  PazarGunu: "Pazar",
};

// Prisma @db.Time degerleri 1970-01-01 UTC tabanli Date gelir; saat-dakika
// kismi yerel saati temsil eder (bkz. pazar-haftasi.ts ayni varsayim).
function saatMetni(saat: Date): string {
  return `${String(saat.getUTCHours()).padStart(2, "0")}:${String(saat.getUTCMinutes()).padStart(2, "0")}`;
}

// Pasif (aktifMi=false) pazar vitrinden tamamen gizlenir (notFound) - magaza
// sayfasinin getMagazaBySlug icindeki pazar.aktifMi filtresiyle ayni karar
// (bkz. docs/mimari/pazar-yasam-dongusu.md), sayfa var/yok bilgisi bile sizmasin.
async function pazarGetir(slug: string) {
  const pazar = await prisma.pazar.findUnique({ where: { slug } });
  if (!pazar || !pazar.aktifMi) return null;
  return pazar;
}

// WhatsApp/sosyal onizleme: magaza sayfasindaki generateMetadata deseniyle ayni.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const pazar = await pazarGetir(slug);
  if (!pazar) return {};
  const gun = GUN_ETIKETI[pazar.baslangicGunu] ?? pazar.baslangicGunu;
  const aciklama =
    pazar.aciklama?.trim() ||
    `${pazar.ilce}'de her ${gun} kurulan yerel üretici pazarı — Tezgahımdan'da`;
  return {
    title: pazar.ad,
    description: aciklama,
    openGraph: { title: pazar.ad, description: aciklama },
  };
}

// Urun sorgusu ile kategori-cip sorgusu AYNI gorunurluk/arama kurallarini
// paylasmali - tek yerde tutulur (ana sayfadaki vitrinGorunurlukFiltresi ile
// ayni gerekce). kategoriId cip sorgusunda BILEREK gecilmez.
function pazarUrunFiltresi(
  pazarId: string,
  arama: string,
  kategoriId: string | null,
): Prisma.UrunWhereInput {
  return {
    silindiMi: false,
    durum: { in: ["sergide", "doldu"] },
    ...(kategoriId ? { kategoriId } : {}),
    magaza: { pazarId, silindiMi: false, gizliMi: false, duraklatildiMi: false },
    ...(arama
      ? {
          OR: [
            { baslik: { contains: arama, mode: "insensitive" } },
            { aciklama: { contains: arama, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

export default async function PazarSayfasi({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  // ?q=: pazar-ICI arama (PazarIciArama) - urun baslik/aciklamasi ile tezgah
  // ad/aciklamasinda arar. Anasayfadaki ?q= (bolge aramasi) ile KARISTIRMA -
  // burada kapsam zaten tek pazar, aranan sey urun/tezgah.
  // ?sayfa= / ?kategori=: vitrin sayfalamasi (bkz. docs/mimari/vitrin-sayfalama.md)
  searchParams: Promise<{ q?: string; sayfa?: string; kategori?: string }>;
}) {
  const { slug } = await params;
  const { q, sayfa, kategori } = await searchParams;
  const arama = q?.trim() || "";
  const sayfaNo = sayfaNoCoz(sayfa);
  const secilenKategoriId = kategori?.trim() || null;
  const pazar = await pazarGetir(slug);
  if (!pazar) notFound();

  // KP-1: vitrin girissiz herkese acik; giris durumu + telefon bilgisi
  // "Rezerve Et" akisi icin kartlara gecilir (magaza sayfasiyla ayni desen).
  const session = await auth();
  const girisli = !!session?.user?.id;
  let kullaniciTelefonVar = false;
  if (session?.user?.id) {
    const kullanici = await prisma.kullanici.findUnique({
      where: { id: session.user.id },
      select: { telefon: true },
    });
    kullaniciTelefonVar = !!kullanici?.telefon;
  }

  // Tezgahlar + urunler AYNI pazara scope'lu; gorunurluk filtreleri ana
  // sayfadakiyle birebir ayni (silindiMi/gizliMi - gizlenen magaza ve urunu
  // burada da sizmasin).
  //
  // 2026-07-15: urun listesi artik SAYFALI ("Daha Fazla Goster"). Eskiden
  // "tek pazarin urun sayisi kucuk kalir" varsayimiyla limitsizdi - tam da
  // olcekte kirilan varsayim bu. Sayfa boyu ana sayfayla AYNI ayardan
  // (yeni_urunler.ogeSayisi) okunur: burasi da magazalar-arasi bir urun
  // izgarasi, ayri bir ayar yaratmak admin'e karsiliksiz bir kontrol daha
  // koymak olurdu. TEZGAH listesi (magazalar) sayfalanmadi - o bir pazarin
  // tezgah sayisi kadar, dogal olarak kucuk.
  const yeniUrunlerModul = (await sayfaModulleriGetir("anasayfa")).find((m) => m.tur === "yeni_urunler");
  const urunSayfaBoyu =
    ((yeniUrunlerModul?.ayarlar ?? {}) as { ogeSayisi?: number }).ogeSayisi ?? 12;
  const urunLimit = urunSayfaBoyu * sayfaNo;

  const [magazalar, urunlerHam, kategoriCipleri] = await Promise.all([
    prisma.magaza.findMany({
      where: {
        pazarId: pazar.id,
        silindiMi: false,
        gizliMi: false,
        duraklatildiMi: false,
        ...(arama
          ? {
              OR: [
                { ad: { contains: arama, mode: "insensitive" } },
                { aciklama: { contains: arama, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: { _count: { select: { urunler: { where: { silindiMi: false } } } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.urun.findMany({
      where: pazarUrunFiltresi(pazar.id, arama, secilenKategoriId),
      include: { kategori: true, magaza: { select: { id: true, ad: true, slug: true } } },
      orderBy: { createdAt: "desc" },
      take: urunLimit + 1, // +1 = "daha var mi" (bkz. sayfaKes)
    }),
    // Cipler yuklenen urunlerden DEGIL, bu pazarda gorunur urunu olan tum
    // kategorilerden (kategori filtresi HARIC - yoksa secilen cip disindaki
    // cipler kaybolurdu).
    prisma.kategori.findMany({
      where: { silindiMi: false, urunler: { some: pazarUrunFiltresi(pazar.id, arama, null) } },
      orderBy: [{ sira: "asc" }, { ad: "asc" }],
      select: { id: true, ad: true, sira: true },
    }),
  ]);

  const { ogeler: urunler, dahaVarMi: urunDahaVarMi } = sayfaKes(urunlerHam, urunLimit);

  // Mevcut parametreleri koruyarak tek birini degistirir (ana sayfadaki
  // anasayfaHref ile ayni desen). slug ONCEDEN yakalanir: `function` bildirimi
  // hoist edildigi icin TS, yukaridaki notFound() daralmasini closure icinde
  // koruyamiyor (pazar: Pazar | null gorunuyor).
  const pazarSlug = pazar.slug;
  function pazarHref(degisiklik: { kategori?: string | null; sayfa?: number }) {
    const p = new URLSearchParams();
    if (arama) p.set("q", arama);
    const yeniKategori = degisiklik.kategori !== undefined ? degisiklik.kategori : secilenKategoriId;
    if (yeniKategori) p.set("kategori", yeniKategori);
    const yeniSayfa = degisiklik.sayfa ?? sayfaNo;
    if (yeniSayfa > 1) p.set("sayfa", String(yeniSayfa));
    const qs = p.toString();
    return qs ? `/pazar/${pazarSlug}?${qs}` : `/pazar/${pazarSlug}`;
  }
  // Kategori degisince sayfa 1'e doner.
  const pazarKategoriHref = (kategoriId: string | null) => pazarHref({ kategori: kategoriId, sayfa: 1 });
  const pazarSayfaHref = (yeniSayfa: number) => pazarHref({ sayfa: yeniSayfa });

  const urunIdler = urunler.map((u) => u.id);
  const magazaIdler = Array.from(
    new Set([...magazalar.map((m) => m.id), ...urunler.map((u) => u.magaza.id)]),
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
    begeniSayilariHaritasi(urunIdler),
    kullaniciFavoriHaritasi(session?.user?.id, urunIdler),
    kuyrukSayilariHaritasi(urunIdler),
    benimRezervasyonlarimHaritasi(session?.user?.id, urunIdler),
    degerlendirmeOzetiHaritasi(urunIdler),
    urunYorumlariHaritasi(urunIdler),
    magazaDegerlendirmeOzetiHaritasi(magazaIdler),
    pasifUrunIdSeti(),
  ]);

  const gun = GUN_ETIKETI[pazar.baslangicGunu] ?? pazar.baslangicGunu;
  const kapanisGunu = GUN_ETIKETI[pazar.sifirlamaGunu] ?? pazar.sifirlamaGunu;
  // Baslangic ve kapanis ayni gundeyse "Her Çarşamba 09:00 – 20:00", farkli
  // gundeyse (gece pazari gibi) iki gun de acikca yazilir.
  const zamanMetni =
    pazar.baslangicGunu === pazar.sifirlamaGunu
      ? `Her ${gun} ${saatMetni(pazar.baslangicSaati)} – ${saatMetni(pazar.sifirlamaSaati)}`
      : `${gun} ${saatMetni(pazar.baslangicSaati)} – ${kapanisGunu} ${saatMetni(pazar.sifirlamaSaati)}`;

  // Logo (link'li/link'siz) - hem kompakt mobil hem tam masaustu bloğunda
  // AYNI mantik, sadece boyut farkli. Alanlar parametre olarak verilir (dis
  // `pazar` degiskenini kapatmak yerine) - TS'in null-daraltmasi (notFound()
  // sonrasi) ic ice fonksiyon govdesine tasinmiyor, parametre bunu asar.
  function logoBlok(yukseklikClass: string, logoUrl: string, logoLink: string | null, altMetin: string) {
    const gorsel = (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoUrl} alt={altMetin} className={`w-auto object-contain ${yukseklikClass}`} />
    );
    return logoLink ? (
      <a
        href={logoLink}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex rounded-lg bg-white p-2 shadow-sm transition-shadow hover:shadow-md hover:ring-2 hover:ring-white/60"
      >
        {gorsel}
      </a>
    ) : (
      <div className="inline-flex rounded-lg bg-white p-2 shadow-sm">{gorsel}</div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-6">
        {/* Pazar tanitim hero'su - MagazaHero ile ayni gorsel dil. Kapak
            fotografi varsa arka plan olur; ustune AYNI gradyanin yari saydam
            hali biner (yeni renk/desen eklenmez - gorsel sadelik kurali),
            metin okunabilirligi her kapakta garanti kalir. Kapak yoksa duz
            gradyan (onceki gorunum) aynen. */}
        <div className="relative overflow-hidden rounded-2xl shadow-sm">
          {pazar.kapakFotoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pazar.kapakFotoUrl}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          <div
            className={`relative px-6 py-8 text-white sm:px-8 sm:py-10 ${
              pazar.kapakFotoUrl
                ? "bg-linear-to-br from-primary-700/85 to-primary-900/80"
                : "bg-linear-to-br from-primary-600 to-primary-700"
            }`}
          >
            {/* Iki sutun (2026-07-10 kullanici istegi): SOLDA kimlik+bilgiler
                (logo, konum, ad, saat, belediye, harita), dikey ayrac
                (HaftalikRitim'deki bg-white/30 cizgi deseni), SAGDA aciklama.
                Aciklama yoksa ayrac da yok, sol blok tam genislik. Mobilde
                alt alta duser (ayrac gizli), sol blok once. */}
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
              <div className="sm:flex-1">
                {/* Mobil kompakt yerlesim (2026-07-10, kullanici UCUNCU
                    duzeltmesi): konum artik pazar adinin USTUNDE, sag
                    sutunun kendi genisligine (col-span-2, ~193px) sigacak
                    kucuk punto + truncate guvenlik agi ile. Haritada Gor
                    kendi tek-elemanli satirinda sola yaslanir (varsayilan
                    blok akisi - flex/justify gerekmiyor artik, konum o
                    satirdan tasindigi icin). sm: ustunde gizlenir, yerine
                    asagidaki ORIJINAL tek-sutunlu blok gorunur (degismedi). */}
                <div className="sm:hidden">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1">
                      {pazar.belediyeLogoUrl &&
                        logoBlok("h-10", pazar.belediyeLogoUrl, pazar.belediyeLogoLink, pazar.belediyeAdi ?? "Belediye logosu")}
                      {pazar.belediyeAdi && (
                        <p className="mt-2 text-xs font-medium text-primary-200">{pazar.belediyeAdi}</p>
                      )}
                    </div>
                    <div className="col-span-2 min-w-0">
                      <p className="flex items-center gap-1 text-[11px] font-medium text-primary-100">
                        <MapPin className="h-3 w-3 shrink-0" strokeWidth={2} />
                        <span className="truncate">
                          {pazar.il} · {pazar.ilce}
                          {pazar.semt ? ` · ${pazar.semt}` : ""}
                        </span>
                      </p>
                      <h1 className="mt-1 text-xl font-bold tracking-tight">{pazar.ad}</h1>
                      <p className="mt-1.5 text-xs font-medium text-primary-100">{zamanMetni}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <a
                      href={pazar.googleHaritaLinki}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-primary-700 hover:bg-primary-50"
                    >
                      <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
                      Haritada Gör
                    </a>
                  </div>
                </div>

                <div className="hidden sm:block">
                  {pazar.belediyeLogoUrl && (
                    <div className="mb-4">
                      {logoBlok(
                        "h-12 sm:h-14",
                        pazar.belediyeLogoUrl,
                        pazar.belediyeLogoLink,
                        pazar.belediyeAdi ?? "Belediye logosu",
                      )}
                    </div>
                  )}
                  <p className="flex items-center gap-1.5 text-sm font-medium text-primary-100">
                    <MapPin className="h-4 w-4" strokeWidth={2} />
                    {pazar.il} · {pazar.ilce}
                    {pazar.semt ? ` · ${pazar.semt}` : ""}
                  </p>
                  <h1 className="mt-2 text-3xl font-bold tracking-tight">{pazar.ad}</h1>
                  <p className="mt-2 text-sm font-medium text-primary-100">{zamanMetni}</p>
                  {pazar.belediyeAdi && (
                    <p className="mt-1 text-sm text-primary-200">{pazar.belediyeAdi}</p>
                  )}
                  <div className="mt-4">
                    <a
                      href={pazar.googleHaritaLinki}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-primary-700 hover:bg-primary-50"
                    >
                      <ExternalLink className="h-4 w-4" strokeWidth={2} />
                      Haritada Gör
                    </a>
                  </div>
                </div>
              </div>
              {pazar.aciklama && (
                <>
                  <div className="hidden w-px self-stretch bg-white/30 sm:block" />
                  <div className="border-t border-white/30 pt-5 sm:flex-1 sm:border-t-0 sm:pt-0">
                    <p className="text-primary-50">{pazar.aciklama}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Pazar-ici arama (2026-07-10) - VitrinArama'nin (anasayfa) dar
            kapsamli kardesi, ayni gorsel dil. */}
        <div className="mt-6">
          <PazarIciArama pazarSlug={pazar.slug} baslangicSorgu={arama} />
        </div>

        {/* 2026-07-10 kullanici karari: URUNLER once, TEZGAHLAR sonra -
            tezgah kartlari (6-7 satir kaplayabiliyor) alicinin urune ulasmadan
            once uzun bir kaydirma yapmasina neden oluyordu. Kim isterse
            tezgahlari asagida gormeye devam eder. */}
        {(arama || urunler.length > 0) && (
          <div className="mt-8">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-bold text-neutral-900">Bu Pazardaki Ürünler</h2>
              {arama && (
                <p className="text-sm text-neutral-500">
                  &quot;{arama}&quot; için {urunler.length} sonuç ·{" "}
                  <Link href={`/pazar/${pazar.slug}`} className="font-medium text-primary-600 hover:underline">
                    Temizle
                  </Link>
                </p>
              )}
            </div>
            <div className="mt-4">
              {arama && urunler.length === 0 ? (
                <p className="text-neutral-500">&quot;{arama}&quot; ile eşleşen ürün yok.</p>
              ) : (
                <YeniEklenenler
                  girisli={girisli}
                  kullaniciTelefonVar={kullaniciTelefonVar}
                  kategoriler={kategoriCipleri}
                  secilenKategoriId={secilenKategoriId}
                  kategoriHrefUret={pazarKategoriHref}
                  urunler={urunler.map((urun) => ({
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
                      degerlendirmeOrtalamasi:
                        magazaDegerlendirmeOzeti.get(urun.magaza.id)?.ortalama ?? null,
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
                  }))}
                />
              )}
              {urunDahaVarMi && <DahaFazlaButonu href={pazarSayfaHref(sayfaNo + 1)} />}
            </div>
          </div>
        )}

        {/*
          id="tezgahlar": ana sayfadaki "Bu Pazardaki Tüm Tezgahlar" linkinin
          inis noktasi (/magazalar kaldirildi, bkz. docs/mimari/anasayfa-kapsam-ekseni.md).
          scroll-mt: sabit baslik altinda kalmasin. Ana sayfadaki magaza_listesi
          bolumunun id="magazalar" deseniyle ayni.
        */}
        <div id="tezgahlar" className="mt-8 scroll-mt-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold text-neutral-900">Bu Pazardaki Tezgahlar</h2>
            {arama && (
              <p className="text-sm text-neutral-500">
                &quot;{arama}&quot; için {magazalar.length} sonuç ·{" "}
                <Link href={`/pazar/${pazar.slug}`} className="font-medium text-primary-600 hover:underline">
                  Temizle
                </Link>
              </p>
            )}
          </div>
          <div className="mt-4">
            {arama && magazalar.length === 0 ? (
              <p className="text-neutral-500">&quot;{arama}&quot; ile eşleşen tezgah yok.</p>
            ) : (
              <MagazaVitrini
                magazalar={magazalar.map((magaza) => ({
                  id: magaza.id,
                  ad: magaza.ad,
                  slug: magaza.slug,
                  aciklama: magaza.aciklama,
                  pazarAd: pazar.ad,
                  urunSayisi: magaza._count.urunler,
                  degerlendirmeOrtalamasi: magazaDegerlendirmeOzeti.get(magaza.id)?.ortalama ?? null,
                  degerlendirmeSayisi: magazaDegerlendirmeOzeti.get(magaza.id)?.sayi ?? 0,
                }))}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
