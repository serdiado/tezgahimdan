import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMagazaBySlug } from "@/lib/magaza";
import { begeniSayilariHaritasi, kullaniciFavoriHaritasi } from "@/lib/favori";
import { benimRezervasyonlarimHaritasi, kuyrukSayilariHaritasi, pasifUrunIdSeti } from "@/lib/rezervasyon";
import { kullaniciMagazaTakipDurumu } from "@/lib/magaza-takip";
import { degerlendirmeOzetiHaritasi, urunYorumlariHaritasi } from "@/lib/degerlendirme";
import { magazaDegerlendirmeOzeti, magazaYorumlariGetir } from "@/lib/magaza-degerlendirme";
import { sayfaModulleriGetir } from "@/lib/sayfa-modulu";
import { SiteHeader } from "@/components/SiteHeader";
import { MagazaTakipButonu } from "@/components/MagazaTakipButonu";
import { MagazaYorumlari } from "@/components/MagazaYorumlari";
import { MagazaHero } from "./MagazaHero";
import { MagazaIcerik } from "./MagazaIcerik";
import { MagazaSikayetButonu } from "./MagazaSikayetButonu";

const tarihFormat = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" });
const fiyatFormat = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });

// WhatsApp/sosyal medya link onizlemesi (og:image) icin. PaylasButonlari tek
// urun paylasirken /magaza/[slug]?urun=<id> URL'ini kullaniyor (ayri bir
// /urun/[id] sayfasi yok) - burada searchParams'taki urun id'sine gore ya o
// urunun fotografini (tekil paylasim) ya da magazanin kroki fotografini
// (magaza geneli paylasim) og:image yapiyoruz. Goreli path'ler root
// layout'taki metadataBase ile otomatik mutlaklastiriliyor.
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ urun?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { urun: urunId } = await searchParams;
  const magaza = await getMagazaBySlug(slug);
  if (!magaza) return {};

  if (urunId) {
    const urun = await prisma.urun.findFirst({
      where: { id: urunId, magazaId: magaza.id, silindiMi: false },
      select: { baslik: true, fiyat: true, aciklama: true, fotograflar: true },
    });
    if (urun) {
      const baslik = `${urun.baslik} — ${magaza.ad}`;
      const aciklama = urun.aciklama?.trim() || `${fiyatFormat.format(Number(urun.fiyat))} — ${magaza.ad} tezgahından`;
      return {
        title: baslik,
        description: aciklama,
        openGraph: {
          title: baslik,
          description: aciklama,
          images: urun.fotograflar[0] ? [urun.fotograflar[0]] : undefined,
        },
      };
    }
  }

  const aciklama = magaza.aciklama?.trim() || `${magaza.ad} — Tezgahımdan'da`;
  return {
    title: magaza.ad,
    description: aciklama,
    openGraph: {
      title: magaza.ad,
      description: aciklama,
      images: magaza.krokiFotoUrl ? [magaza.krokiFotoUrl] : undefined,
    },
  };
}

export default async function MagazaSayfasi({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const magaza = await getMagazaBySlug(slug);

  if (!magaza) {
    notFound();
  }

  // SELF-SERVIS duraklatma (2026-07-11): duraklatilan tezgah tum listelerden
  // duser ama dogrudan linkte 404 OLMAZ - duraklatma iptal bildirimi alicilari
  // tam buraya yonlendirir ("WhatsApp'tan sorabilirsin"), WhatsApp dugmesi
  // hero'da. Urunler/yorumlar/rezervasyon gizli; sadece hero + aciklama notu.
  if (magaza.duraklatildiMi) {
    const [magazaDegerlendirmeSonucu, heroModulleri] = await Promise.all([
      magazaDegerlendirmeOzeti(magaza.id),
      sayfaModulleriGetir("magaza_hero"),
    ]);
    return (
      <div className="min-h-screen bg-neutral-50">
        <SiteHeader />
        <main className="mx-auto max-w-5xl px-4 py-6">
          <MagazaHero
            magaza={{
              ad: magaza.ad,
              aciklama: magaza.aciklama,
              whatsappNo: magaza.whatsappNo,
              tezgahBilgisi: magaza.tezgahBilgisi,
              krokiFotoUrl: magaza.krokiFotoUrl,
              instagramUrl: magaza.instagramUrl,
              facebookUrl: magaza.facebookUrl,
              tiktokUrl: magaza.tiktokUrl,
              pazar: {
                ad: magaza.pazar.ad,
                slug: magaza.pazar.slug,
                sifirlamaGunu: magaza.pazar.sifirlamaGunu,
              },
            }}
            degerlendirme={magazaDegerlendirmeSonucu}
            bilesenSirasi={heroModulleri.map((m) => ({ tur: m.tur, aktifMi: m.aktifMi }))}
          />
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Bu tezgah şu an ara verdi — ürünleri geçici olarak kaldırıldı. Merak ettiklerini
            yukarıdaki WhatsApp hattından tezgah sahibine sorabilirsin.
          </div>
        </main>
      </div>
    );
  }

  // KP-1: vitrin girissiz herkese acik (kesif serbest); yalniz "Rezerve Et" giris
  // ister. Kartlara giris durumu + kullanicinin kayitli telefonu olup olmadigi
  // gecilir (telefon yoksa ilk rezervasyonda bir kerelik istenecek).
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

  // 'doldu' VE 'satildi' urunler de listelenir (buton kapali olarak) - bir
  // magazanin kendi sayfasi capraz-magaza vitrinlerden (ana sayfa) farkli:
  // gecmis satislar/yorumlar burada gorunur kalmali (alici "bu magazadan ne
  // almisim" diye arayabilir). Sadece silinmis urunler gizli kalir. (Ana
  // sayfadaki VITRIN_GORUNURLUK_FILTRESI kasitli olarak 'satildi' HARIC tutar
  // - o capraz-magaza kesif akisi, satilmis urunun "yeni/begenilen" gibi
  // yaniltici gorunmesini onler; bu iki filtre BILINCLI olarak farkli.)
  const urunler = await prisma.urun.findMany({
    where: { magazaId: magaza.id, durum: { in: ["sergide", "doldu", "satildi"] }, silindiMi: false },
    include: { kategori: true },
    orderBy: { createdAt: "desc" },
  });

  // N+1 onlemek icin TEK toplu sorgu + Map (aliciGuvenilirlikHaritasi ile ayni
  // desen, bkz. rezervasyon.ts). Begeni sayisi herkese acik (girissiz de dahil),
  // "benim begenim/takibim" sadece girisliyse dolu gelir (kullaniciId yoksa
  // haritalar bos doner).
  const urunIdler = urunler.map((u) => u.id);
  const [
    begeniSayilari,
    benimFavorilerim,
    kuyrukSayilari,
    benimRezervasyonlarim,
    benimMagazaTakibimVar,
    degerlendirmeOzeti,
    yorumlar,
    magazaDegerlendirmeSonucu,
    magazaYorumlari,
    heroModulleri,
    pasifUrunIdler,
  ] = await Promise.all([
    begeniSayilariHaritasi(urunIdler),
    kullaniciFavoriHaritasi(session?.user?.id, urunIdler),
    kuyrukSayilariHaritasi(urunIdler),
    benimRezervasyonlarimHaritasi(session?.user?.id, urunIdler),
    kullaniciMagazaTakipDurumu(session?.user?.id, magaza.id),
    degerlendirmeOzetiHaritasi(urunIdler),
    urunYorumlariHaritasi(urunIdler),
    magazaDegerlendirmeOzeti(magaza.id),
    magazaYorumlariGetir(magaza.id, { take: 4 }),
    sayfaModulleriGetir("magaza_hero"),
    pasifUrunIdSeti(magaza.id),
  ]);

  return (
    <div className="min-h-screen bg-neutral-50">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-8">
          <MagazaHero
            magaza={{
              ad: magaza.ad,
              aciklama: magaza.aciklama,
              whatsappNo: magaza.whatsappNo,
              tezgahBilgisi: magaza.tezgahBilgisi,
              krokiFotoUrl: magaza.krokiFotoUrl,
              instagramUrl: magaza.instagramUrl,
              facebookUrl: magaza.facebookUrl,
              tiktokUrl: magaza.tiktokUrl,
              pazar: {
                ad: magaza.pazar.ad,
                slug: magaza.pazar.slug,
                sifirlamaGunu: magaza.pazar.sifirlamaGunu,
              },
            }}
            degerlendirme={magazaDegerlendirmeSonucu}
            bilesenSirasi={heroModulleri.map((m) => ({ tur: m.tur, aktifMi: m.aktifMi }))}
          />
          <div className="mt-2 flex items-center justify-between">
            <MagazaTakipButonu girisli={girisli} magazaId={magaza.id} benimTakibimVar={benimMagazaTakibimVar} />
            <MagazaSikayetButonu girisli={girisli} magazaId={magaza.id} magazaAd={magaza.ad} />
          </div>
          <MagazaYorumlari
            magazaSlug={magaza.slug}
            toplamSayi={magazaDegerlendirmeSonucu.sayi}
            yorumlar={magazaYorumlari.map((y) => ({
              id: y.id,
              kullaniciAd: y.kullaniciAd,
              puan: y.puan,
              yorum: y.yorum,
              tarih: tarihFormat.format(y.createdAt),
            }))}
          />
        </div>

        <MagazaIcerik
          girisli={girisli}
          kullaniciTelefonVar={kullaniciTelefonVar}
          magazaSlug={magaza.slug}
          urunler={urunler.map((urun) => ({
            id: urun.id,
            baslik: urun.baslik,
            aciklama: urun.aciklama,
            fiyat: Number(urun.fiyat),
            durum: urun.durum,
            fotograflar: urun.fotograflar,
            kategori: { id: urun.kategori.id, ad: urun.kategori.ad, sira: urun.kategori.sira },
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
      </main>
    </div>
  );
}
