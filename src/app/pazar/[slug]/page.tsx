import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink, MapPin } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { begeniSayilariHaritasi, kullaniciFavoriHaritasi } from "@/lib/favori";
import { benimRezervasyonlarimHaritasi, kuyrukSayilariHaritasi, pasifUrunIdSeti } from "@/lib/rezervasyon";
import { degerlendirmeOzetiHaritasi, urunYorumlariHaritasi } from "@/lib/degerlendirme";
import { magazaDegerlendirmeOzetiHaritasi } from "@/lib/magaza-degerlendirme";
import { SiteHeader } from "@/components/SiteHeader";
import { MagazaVitrini } from "@/app/MagazaVitrini";
import { YeniEklenenler } from "@/app/YeniEklenenler";

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

export default async function PazarSayfasi({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
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
  // burada da sizmasin). Sayfalama YOK - tek pazarin tezgah/urun sayisinin
  // kucuk kalacagi varsayimi (magaza sayfasindaki ayni kapsam karari).
  const [magazalar, urunler] = await Promise.all([
    prisma.magaza.findMany({
      where: { pazarId: pazar.id, silindiMi: false, gizliMi: false },
      include: { _count: { select: { urunler: { where: { silindiMi: false } } } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.urun.findMany({
      where: {
        silindiMi: false,
        durum: { in: ["sergide", "doldu"] },
        magaza: { pazarId: pazar.id, silindiMi: false, gizliMi: false },
      },
      include: { kategori: true, magaza: { select: { id: true, ad: true, slug: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

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

  return (
    <div className="min-h-screen bg-neutral-50">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-6">
        {/* Pazar tanitim hero'su - MagazaHero ile ayni gorsel dil (gradyan kart). */}
        <div className="rounded-2xl bg-linear-to-br from-primary-600 to-primary-700 px-6 py-8 text-white shadow-sm sm:px-8 sm:py-10">
          <p className="flex items-center gap-1.5 text-sm font-medium text-primary-100">
            <MapPin className="h-4 w-4" strokeWidth={2} />
            {pazar.il} · {pazar.ilce}
            {pazar.semt ? ` · ${pazar.semt}` : ""}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{pazar.ad}</h1>
          {pazar.aciklama && <p className="mt-2 max-w-xl text-primary-50">{pazar.aciklama}</p>}
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

        <div className="mt-8">
          <h2 className="text-lg font-bold text-neutral-900">Bu Pazardaki Tezgahlar</h2>
          <div className="mt-4">
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
          </div>
        </div>

        {urunler.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-bold text-neutral-900">Bu Pazardaki Ürünler</h2>
            <div className="mt-4">
              <YeniEklenenler
                girisli={girisli}
                kullaniciTelefonVar={kullaniciTelefonVar}
                urunler={urunler.map((urun) => ({
                  id: urun.id,
                  baslik: urun.baslik,
                  aciklama: urun.aciklama,
                  fiyat: Number(urun.fiyat),
                  durum: urun.durum,
                  fotograflar: urun.fotograflar,
                  kategori: { id: urun.kategori.id, ad: urun.kategori.ad },
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
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
