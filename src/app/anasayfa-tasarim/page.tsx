import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, MapPinned, Sparkles, Store } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { HaftalikRitim } from "@/app/HaftalikRitim";
import { pazarRitimBilgisi } from "@/lib/pazar-haftasi";
import { PazarKarti } from "./PazarKarti";
import { PazarAra } from "./PazarAra";
import { MOCK_PAZARLAR, SEHIRLER, TOPLAM_TEZGAH } from "./mock-veri";

// TASARIM TASLAGI - HERKESE ACIK DEGIL (2026-07-16 kullanici talebi).
//
// Bu sayfa docs/mimari/anasayfa-kapsam-ekseni.md'nin N>=2 (coklu pazar) hedef
// tasarimini SOMUT gostermek icin var: "5 sehir, 10 pazar olsa ana sayfa nasil
// gorunur?" sorusuna cevap. O mimari kararda kilitlenen tek kural burada da
// gecerli: **capraz katman urun GOSTERMEZ** - bu sayfada tek bir urun karti
// yok, cunku kargo olmadan capraz-pazar urun vaadi tutulamaz bir soz olurdu.
//
// BILEREK HICBIR YERDEN LINK VERILMEDI: SiteHeader/SiteFooter/ana sayfada bu
// route'a referans yok, sadece URL'i bilen gorur. noindex de ayni gerekceyle -
// arama motorlarina hic gorunmesin.
//
// Veri TAMAMEN KURGUSAL (bkz. mock-veri.ts) - Seferihisar disindaki 9 pazar
// gercek bir belediye anlasmasini TEMSIL ETMEZ, sadece cok-pazarli deneyimin
// nasil hissettirecegini gostermek icin var. Sayfadaki banner bunu acikca
// belirtir; PazarKarti'nda gercek olmayanlar "Örnek" rozetiyle isaretlenir ve
// TIKLANAMAZ (yalnizca Seferihisar gercekten calisan sayfaya gider).
export const metadata: Metadata = {
  title: "Tasarım Taslağı — Çok Pazarlı Ana Sayfa",
  robots: { index: false, follow: false },
};

export default function AnasayfaTasarim() {
  const simdi = new Date();
  const bugunAdi = new Intl.DateTimeFormat("tr-TR", { weekday: "long", timeZone: "Europe/Istanbul" }).format(simdi);

  // pazarRitimBilgisi GERCEK motor fonksiyonu (lib/pazar-haftasi.ts) - mock
  // veriyle bile calisir cunku sadece HaftaGunu/saat/saatDilimi sekli bekliyor.
  // Boylece "bugun hangi pazar kuruluyor" hesabi UYDURULMUYOR, gercek kod
  // yolundan geciyor - hangi gun goruntulense dogru sonuc verir.
  const bugunKuranlar = MOCK_PAZARLAR.filter((p) => pazarRitimBilgisi(p, simdi).bugunPazarGunuMu);

  const sehreGoreGruplu = SEHIRLER.map((il) => ({
    il,
    pazarlar: MOCK_PAZARLAR.filter((p) => p.il === il),
  }));

  // "Senin Pazarın" kisayolu: gercek uygulamada cerezde hatirlanan secim
  // olacak (bkz. anasayfa-kapsam-ekseni.md #4 "URL asil, cerez tercih").
  // Bu prototipte sabit Seferihisar gosterilir - konsepti anlatmaya yeter,
  // cerez/oturum mantigi kurmak bu tasarim taslaginin kapsami disinda.
  const seninPazarin = MOCK_PAZARLAR[0];

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Tasarim etiketi - GORMEZDEN GELINEMEZ olacak kadar belirgin ama
          marka paletini bozmayacak sekilde notr (primary degil, neutral-900) -
          "bu gercek urun degil" mesaji her zaman UI'nin geri kalanindan
          gorsel olarak ayrisik kalmali. */}
      <div className="bg-neutral-900 px-4 py-2.5 text-center text-xs font-medium text-white sm:text-sm">
        <Sparkles className="mr-1.5 inline h-3.5 w-3.5 text-primary-300" strokeWidth={2} />
        Tasarım önizlemesi — çok pazarlı geleceğin ana sayfa taslağı. Pazarlar ve sayılar örnektir, gerçek değildir.
      </div>

      <SiteHeader />

      <main className="mx-auto max-w-5xl px-4 py-6">
        {/* HERO: "bugun hangi pazar" + "benim pazarim hangisi" TEK momentte
            birlesir (anasayfa-kapsam-ekseni.md #8, madde 1+2). */}
        <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-primary-600 to-primary-700 px-6 py-10 text-white shadow-sm sm:px-10 sm:py-14">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold text-primary-100">Bugün {bugunAdi}</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              {bugunKuranlar.length > 0
                ? `${bugunKuranlar.length} pazar bugün kuruluyor`
                : "Bugün pazar günü değil, yaklaşanlara göz at"}
            </h1>
            <p className="mt-3 text-sm text-primary-100 sm:text-base">
              Üreten kadınların tezgahını bul, ürünü rezerve et, pazar günü elden al.
            </p>

            <div className="mt-6">
              <PazarAra pazarlar={MOCK_PAZARLAR} />
            </div>

            {/* Olcek guveni: capraz urun/satici degil, sadece AGREGE sayilar -
                hicbir sey "al" diye vaat etmiyor, sadece "bu kadar genisiz" diyor. */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-primary-100">
              <span>
                <strong className="text-white">{SEHIRLER.length}</strong> Şehir
              </span>
              <span className="text-primary-300">·</span>
              <span>
                <strong className="text-white">{MOCK_PAZARLAR.length}</strong> Pazar
              </span>
              <span className="text-primary-300">·</span>
              <span>
                <strong className="text-white">{TOPLAM_TEZGAH}</strong> Tezgah
              </span>
            </div>
          </div>
        </div>

        {/* SENIN PAZARIN kisayolu (anasayfa-kapsam-ekseni.md #8: "dönen
            kullanıcı seçim yapmamalı, yabancıya navigasyon, müdavime kısayol").
            Hero'nun hemen altinda, yatay, tek satirlik - goze carpar ama
            navigasyonu bogmaz. */}
        <Link
          href={`/pazar/${seninPazarin.slug}`}
          className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-neutral-100 transition-shadow hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600">
              <MapPinned className="h-5 w-5" strokeWidth={2} />
            </div>
            <div>
              <p className="text-xs text-neutral-500">Senin pazarın</p>
              <p className="text-sm font-bold text-neutral-900">{seninPazarin.ad}</p>
            </div>
          </div>
          <span className="shrink-0 text-sm font-semibold text-primary-600">Pazara git →</span>
        </Link>

        {/* HAFTALIK RITIM: gercek bilesen, mock veriyle. anasayfa-kapsam-ekseni
            "cogul kapsam" #8 madde 1+3'u tek yerde karsiliyor. */}
        <div className="mt-8">
          <HaftalikRitim pazarlar={MOCK_PAZARLAR} />
        </div>

        {/* SEHRE GORE KESIF: chip ray, asagidaki gruplu listeye ANCHOR ile
            gider - yeni sayfa/route yok, kategori-kesif-ekseni.md'deki "her
            zaman yatay ray" bicim sabitiyle tutarli. */}
        <div className="mt-10">
          <h2 className="text-lg font-bold text-neutral-900">Şehre Göre Keşfet</h2>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {sehreGoreGruplu.map(({ il, pazarlar }) => (
              <a
                key={il}
                href={`#sehir-${il}`}
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-700 shadow-sm ring-1 ring-neutral-100 hover:bg-neutral-100"
              >
                {il}
                <span className="text-neutral-400">· {pazarlar.length}</span>
              </a>
            ))}
          </div>
        </div>

        {/* TUM PAZARLAR - sehre gruplu. Bu sayfanin en somut bolumu: her
            pazarin kapak fotografli karti, gercek /pazar/[slug] hero deseniyle
            AYNI gorsel dil. */}
        <div className="mt-8 flex flex-col gap-8">
          {sehreGoreGruplu.map(({ il, pazarlar }) => (
            <div key={il} id={`sehir-${il}`} className="scroll-mt-6">
              <h3 className="flex items-center gap-2 text-base font-bold text-neutral-900">
                <Store className="h-4 w-4 text-primary-600" strokeWidth={2} />
                {il}
              </h3>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {pazarlar.map((pazar) => (
                  <div key={pazar.id} id={`pazar-${pazar.id}`} className="scroll-mt-6">
                    <PazarKarti pazar={pazar} bugunMu={bugunKuranlar.some((p) => p.id === pazar.id)} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* NASIL CALISIR: 3 adim, guveni pekistirir - kutsal kural ("WhatsApp
            kadar basit") burada da metne dokunuyor. */}
        <div className="mt-12 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-neutral-100 sm:p-8">
          <h2 className="text-lg font-bold text-neutral-900">Tezgahımdan Nasıl Çalışır?</h2>
          <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              { ikon: MapPinned, baslik: "Pazarını Bul", metin: "Şehrinde veya yakınında kurulan pazarı bul." },
              { ikon: ClipboardList, baslik: "Rezerve Et", metin: "Beğendiğin ürünü tek dokunuşla ayırt." },
              { ikon: Store, baslik: "Elden Al", metin: "Pazar günü tezgahtan elden teslim al, ödeme nakit." },
            ].map(({ ikon: Ikon, baslik, metin }, i) => (
              <div key={baslik} className="flex flex-col items-start gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-sm font-bold text-primary-600">
                  {i + 1}
                </div>
                <p className="flex items-center gap-1.5 text-sm font-bold text-neutral-900">
                  <Ikon className="h-4 w-4 text-primary-600" strokeWidth={2} />
                  {baslik}
                </p>
                <p className="text-sm text-neutral-500">{metin}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tasarim notu - kod okuyan/inceleyen icin kisa kontrol listesi,
            kullaniciya kapanis. */}
        <div className="mt-10 rounded-xl border border-dashed border-neutral-300 bg-white px-5 py-4 text-xs text-neutral-500">
          <p className="font-semibold text-neutral-700">Bu sayfa hakkında</p>
          <p className="mt-1">
            {/*
              Duz JSX metin/ifade karisimi (`Bugun {bugunAdi} oldugu icin...`)
              satir-ici bosluklari GUVENILMEZ SEKILDE yutuyordu ("Perşembeolduğu"
              - kaynakta bosluk var, render'da yok, canli ekran goruntusuyle
              dogrulandi). Tum cumleyi TEK bir template-literal string'e
              cevirmek belirsizligi tamamen ortadan kaldirir.
            */}
            {`docs/mimari/anasayfa-kapsam-ekseni.md kararının N≥2 hedef tasarımını gösterir. Yalnızca ${seninPazarin.ad} gerçek — diğer ${MOCK_PAZARLAR.length - 1} pazar kurgusal örnektir, tıklanamaz. Sayfa hiçbir yerden linklenmemiştir, arama motorlarına kapalıdır (noindex). Bugün ${bugunAdi} olduğu için Haftalık Ritim ve "bugün kuruluyor" rozetleri buna göre hesaplandı — farklı bir gün açarsan farklı pazarlar öne çıkar.`}
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
