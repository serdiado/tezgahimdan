import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMagazaBySlug } from "@/lib/magaza";
import { begeniSayilariHaritasi, kullaniciFavoriHaritasi } from "@/lib/favori";
import { kuyrukSayilariHaritasi } from "@/lib/rezervasyon";
import { kullaniciMagazaTakipDurumu } from "@/lib/magaza-takip";
import { degerlendirmeOzetiHaritasi, urunYorumlariHaritasi } from "@/lib/degerlendirme";
import { magazaDegerlendirmeOzeti, magazaYorumlariGetir } from "@/lib/magaza-degerlendirme";
import { SiteHeader } from "@/components/SiteHeader";
import { MagazaTakipButonu } from "@/components/MagazaTakipButonu";
import { MagazaYorumlari } from "@/components/MagazaYorumlari";
import { YildizGosterge } from "@/components/YildizGosterge";
import { MagazaHero } from "./MagazaHero";
import { MagazaIcerik } from "./MagazaIcerik";
import { MagazaSikayetButonu } from "./MagazaSikayetButonu";

const tarihFormat = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" });

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
    benimMagazaTakibimVar,
    degerlendirmeOzeti,
    yorumlar,
    magazaDegerlendirmeSonucu,
    magazaYorumlari,
  ] = await Promise.all([
    begeniSayilariHaritasi(urunIdler),
    kullaniciFavoriHaritasi(session?.user?.id, urunIdler),
    kuyrukSayilariHaritasi(urunIdler),
    kullaniciMagazaTakipDurumu(session?.user?.id, magaza.id),
    degerlendirmeOzetiHaritasi(urunIdler),
    urunYorumlariHaritasi(urunIdler),
    magazaDegerlendirmeOzeti(magaza.id),
    magazaYorumlariGetir(magaza.id, { take: 4 }),
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
              pazar: { ad: magaza.pazar.ad, sifirlamaGunu: magaza.pazar.sifirlamaGunu },
            }}
          />
          <div className="mt-2 flex items-center justify-between">
            <MagazaTakipButonu girisli={girisli} magazaId={magaza.id} benimTakibimVar={benimMagazaTakibimVar} />
            <div className="flex items-center gap-3">
              <YildizGosterge ortalama={magazaDegerlendirmeSonucu.ortalama} sayi={magazaDegerlendirmeSonucu.sayi} boyut="md" bosGoster />
              <MagazaSikayetButonu girisli={girisli} magazaId={magaza.id} magazaAd={magaza.ad} />
            </div>
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
            kategori: { id: urun.kategori.id, ad: urun.kategori.ad },
            begeniSayisi: begeniSayilari.get(urun.id) ?? 0,
            benimBegenimVar: benimFavorilerim.get(urun.id)?.begeniMi ?? false,
            benimTakibimVar: benimFavorilerim.get(urun.id)?.takipMi ?? false,
            stokAdedi: urun.stokAdedi,
            aktifSayisi: kuyrukSayilari.get(urun.id)?.aktif ?? 0,
            yedekSayisi: kuyrukSayilari.get(urun.id)?.yedek ?? 0,
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
