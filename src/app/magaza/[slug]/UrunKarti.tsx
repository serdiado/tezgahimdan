"use client";

import { createElement, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { kategoriIkonuSec, kategoriRengiSec } from "@/lib/kategori-renkleri";
import { BegeniButonu } from "@/components/BegeniButonu";
import { TakipButonu } from "@/components/TakipButonu";
import { PaylasButonlari } from "@/components/PaylasButonlari";
import { SikayetModal } from "@/components/SikayetModal";
import { RezerveModal } from "./RezerveModal";
import { RezervasyonDurumuButon } from "./RezervasyonDurumuButon";
import { UrunDetayModal } from "./UrunDetayModal";

export const DURUM_STIL: Record<string, { etiket: string; className: string }> = {
  sergide: { etiket: "Sergide", className: "bg-green-100 text-green-700" },
  doldu: { etiket: "Dolu", className: "bg-amber-100 text-amber-700" },
  satildi: { etiket: "Satıldı", className: "bg-neutral-200 text-neutral-600" },
};

const BEKLEMEDE_STIL = { etiket: "Beklemede", className: "bg-neutral-300 text-neutral-700" };

// UrunKarti VE UrunDetayModal ayni rozet/kapanma mantigini paylasir - iki
// yerde ayri ayri "beklemedeMi ? ... : DURUM_STIL[...]" yazmak yerine tek yer.
export function urunDurumStili(urun: Pick<UrunKartiVeri, "durum" | "beklemedeMi">) {
  return urun.beklemedeMi
    ? BEKLEMEDE_STIL
    : (DURUM_STIL[urun.durum] ?? { etiket: urun.durum, className: "bg-neutral-200 text-neutral-600" });
}

const fiyatFormat = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
});

export type UrunKartiVeri = {
  id: string;
  baslik: string;
  aciklama: string | null;
  fiyat: number;
  durum: string;
  fotograflar: string[];
  kategori: { id: string; ad: string };
  // Begeni sayisi HERKESE ACIK (girissiz ziyaretciye de gosterilir). Takip
  // (bildirim aboneligi) hem kartta hem UrunDetayModal'da gosterilir.
  begeniSayisi: number;
  benimBegenimVar: boolean;
  benimTakibimVar: boolean;
  stokAdedi: number;
  aktifSayisi: number;
  yedekSayisi: number;
  // Degerlendirme: sayi 0 ise ortalama anlamsiz (null) - YildizGosterge bu
  // durumda hic render etmez. yorumlar SADECE detay modalinda gosterilir,
  // kartta degil (kart alani sinirli).
  degerlendirmeOrtalamasi: number | null;
  degerlendirmeSayisi: number;
  yorumlar: { id: string; kullaniciAd: string; puan: number; yorum: string; tarih: string }[];
  // Kullanicinin bu urunde halihazirda 'bekliyor' rezervasyonu varsa doludur -
  // varsa "Rezerve Et" yerine kendi sira durumu gosterilir (bkz. rezervasyon.ts
  // benimRezervasyonlarimHaritasi). id: vazgec butonu icin.
  benimRezervasyonum: { id: string; tip: "aktif" | "yedek"; siraNo: number; rezervKodu: string } | null;
  // 2026-07-09 karari: saticinin isaretlemedigi, islem-sonu ani gecmis bir
  // rezervasyonu varsa urun TAMAMEN pasiflesir (bkz. rezervasyon.ts
  // pasifUrunIdSeti) - alici satici ihmalinden ASLA etkilenmemeli, bu yuzden
  // belirsizlik cozulene kadar yeni rezervasyon kabul edilmez. Opsiyonel:
  // gecmemis (satildi listesi gibi) yerlerde hic gecilmeyebilir.
  beklemedeMi?: boolean;
};

// Magaza (tezgah) puani icin TEK yildiz, orani (ortalama/5) kadar dolu -
// urun-seviyesi YildizGosterge'nin 5-yildizli hali yerine, mağaza adının
// yanindaki dar alanda kullanilmak uzere. Hic degerlendirme yoksa (sayi===0)
// tamamen bos gorunur (yuzde=0).
export function MagazaYildizi({ ortalama, sayi }: { ortalama: number; sayi: number }) {
  const yuzde = sayi > 0 ? Math.max(0, Math.min(100, (ortalama / 5) * 100)) : 0;
  return (
    <span className="relative inline-block h-3.5 w-3.5 shrink-0">
      <Star className="absolute inset-0 h-3.5 w-3.5 text-neutral-300" strokeWidth={1.5} />
      <span className="absolute inset-0 overflow-hidden" style={{ width: `${yuzde}%` }}>
        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" strokeWidth={1.5} />
      </span>
    </span>
  );
}

export function UrunKarti({
  urun,
  girisli,
  kullaniciTelefonVar,
  magaza,
  magazaSlug,
}: {
  urun: UrunKartiVeri;
  girisli: boolean;
  kullaniciTelefonVar: boolean;
  // Sadece magazalar-arasi listelerde (ana sayfa "Bu Hafta Eklenenler") gecilir -
  // bir magazanin kendi sayfasinda (MagazaIcerik) baglam zaten belli, gerek yok.
  // degerlendirmeOrtalamasi/Sayisi: MAGAZA-seviyesi puan (urun puani DEGIL) -
  // magaza adinin yanindaki tek-yildiz gosterge icin.
  magaza?: { ad: string; slug: string; degerlendirmeOrtalamasi: number | null; degerlendirmeSayisi: number };
  // Paylasim linki (?urun=<id>) icin her zaman gerekli - magaza prop'undan
  // ayri tutulur cunku magaza SADECE capraz-magaza baglaminda "hangi magaza"
  // etiketini gostermek icin var, magazaSlug ise her iki baglamda da linki
  // kurmak icin sart.
  magazaSlug: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  // Redirect-back: /giris'ten ?rezerveEt=<id> ile donuldugunde modal ACIK baslar
  // (kullanici niyetini kaybetmesin). setState-in-effect yerine ilk render'da
  // hesaplanir; yalniz sergideki urun + girisli kullanici icin.
  const [modalAcik, setModalAcik] = useState(
    () => girisli && urun.durum === "sergide" && searchParams.get("rezerveEt") === urun.id,
  );
  const [sikayetModalAcik, setSikayetModalAcik] = useState(false);
  const [detayModalAcik, setDetayModalAcik] = useState(false);
  const renk = kategoriRengiSec(urun.kategori.id);
  // Kategori ikonu render icinde PascalCase bilesen olarak baglanmaz (lint:
  // react-hooks/static-components) - lookup lowercase tutulup createElement ile
  // render edilir.
  const kategoriIkonu = kategoriIkonuSec(urun.kategori.ad);
  // Kart-seviyesinde kucuk bir galeri: oklar/noktalar aktifFotoIndex'i degistirir,
  // modali ACMAZ (ayri, kardes buton - detayTikla'yi tetikleyen alttaki tam-kapli
  // butonun USTUNE binmez, aralarinda parent-child iliskisi yok, invalid nested
  // <button> olusmaz). Paylasim her zaman kapak (ilk) fotografi kullanir, o an
  // gosterilen fotografi degil - tutarli bir "kapak" kavrami.
  const [aktifFotoIndex, setAktifFotoIndex] = useState(0);
  const aktifFoto = urun.fotograflar[aktifFotoIndex];
  const kapakFoto = urun.fotograflar[0];
  const durumStil = urunDurumStili(urun);
  // Kapasite (stok+5) dolunca rezervasyon kapanir (PLAN.md SS3); 'doldu'
  // durumu tam bu esikte, rezervasyon API'sinin icinde atomik olarak atanir.
  // beklemedeMi de kapatir (satici ihmali cozulene kadar yeni rezervasyon yok).
  const rezervasyonKapali = urun.durum !== "sergide" || !!urun.beklemedeMi;

  // Paylasilan link (?urun=<id>) ile gelen ziyaretci bu urune kaydirilir ve kisa
  // sure vurgulanir. Ilk render'da vurgu acik baslar (setState-in-effect yerine),
  // scroll effect'te yapilir, vurgu ~2.5sn sonra timer'da kapanir.
  const hedefUrun = searchParams.get("urun") === urun.id;
  const [vurgulu, setVurgulu] = useState(hedefUrun);
  const kartRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!hedefUrun) return;
    kartRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    const zaman = setTimeout(() => setVurgulu(false), 2500);
    return () => clearTimeout(zaman);
  }, [hedefUrun]);

  function rezerveTikla() {
    if (!girisli) {
      // KP-1: girissiz kullanici once login'e; sonra ayni urune doner.
      const next = `${pathname}?rezerveEt=${urun.id}`;
      router.push(`/giris?next=${encodeURIComponent(next)}`);
      return;
    }
    setModalAcik(true);
  }

  function sikayetTikla() {
    if (!girisli) {
      const next = `${pathname}?urun=${urun.id}`;
      router.push(`/giris?next=${encodeURIComponent(next)}`);
      return;
    }
    setSikayetModalAcik(true);
  }

  function oncekiFoto() {
    setAktifFotoIndex((i) => (i - 1 + urun.fotograflar.length) % urun.fotograflar.length);
  }

  function sonrakiFoto() {
    setAktifFotoIndex((i) => (i + 1) % urun.fotograflar.length);
  }

  // Detay goruntuleme girissiz de acik (kesif serbest, KP-1 yalniz "Rezerve
  // Et"i kimlik ister). Detaydan "Rezerve Et"e basilinca detay kapanir ve
  // AYNI rezerveTikla() cagrilir - giris/telefon mantigi tek yerde kalir.
  function detayTikla() {
    setDetayModalAcik(true);
  }

  function detayRezerveEt() {
    setDetayModalAcik(false);
    rezerveTikla();
  }

  // Ayni desen: detaydan "Bildir"e basilinca detay kapanir, AYNI sikayetTikla()
  // cagrilir - giris kontrolu tek yerde kalir.
  function detaySikayetEt() {
    setDetayModalAcik(false);
    sikayetTikla();
  }

  return (
    <div
      ref={kartRef}
      id={`urun-${urun.id}`}
      className={`flex scroll-mt-24 flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow duration-200 hover:shadow-md ${
        vurgulu ? "ring-2 ring-primary-500 ring-offset-2" : ""
      }`}
    >
      <div className="relative aspect-square w-full">
        <button
          type="button"
          onClick={detayTikla}
          className={`absolute inset-0 cursor-pointer ${aktifFoto ? "bg-neutral-100" : renk.bg}`}
        >
          {aktifFoto ? (
            <Image src={aktifFoto} alt={urun.baslik} fill className="object-cover" sizes="(max-width: 640px) 100vw, 33vw" />
          ) : (
            <div className="flex h-full items-center justify-center">
              {createElement(kategoriIkonu, { className: `h-10 w-10 ${renk.text}`, strokeWidth: 1.5 })}
            </div>
          )}
        </button>
        {/* Durum rozeti HER ZAMAN fotografin sol-ust kosesine bindirilir (mobil/
            masaustu ayrimi kaldirildi - kategori rozeti tamamen kaldirildigi
            icin icerik blogunda ayri bir satira gerek kalmadi). */}
        <span
          className={`absolute left-2 top-2 z-10 w-fit rounded-full px-2 py-0.5 text-xs font-semibold ${durumStil.className}`}
        >
          {durumStil.etiket}
        </span>
        {/* Begeni+Takip HER ZAMAN fotografin sag-ust kosesine bindirilir (mobil/
            masaustu ayrimi kaldirildi - kart sadelestirme). Bildir ikonu
            kasitli DAHIL DEGIL - sadece detay modalinda kalir. */}
        <div className="absolute right-2 top-2 z-10 flex gap-1.5">
          <BegeniButonu
            urunId={urun.id}
            girisli={girisli}
            begeniSayisi={urun.begeniSayisi}
            benimBegenimVar={urun.benimBegenimVar}
            kompakt
            gorselUzerinde
          />
          <TakipButonu
            urunId={urun.id}
            girisli={girisli}
            benimTakibimVar={urun.benimTakibimVar}
            kompakt
            gorselUzerinde
          />
        </div>
        {urun.fotograflar.length > 1 && (
          <>
            <button
              type="button"
              onClick={oncekiFoto}
              aria-label="Önceki fotoğraf"
              className="absolute left-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onClick={sonrakiFoto}
              aria-label="Sonraki fotoğraf"
              className="absolute right-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </>
        )}
      </div>
      {urun.fotograflar.length > 1 && (
        <div className="flex justify-center gap-1.5 pt-2">
          {urun.fotograflar.map((foto, i) => (
            <button
              key={foto}
              type="button"
              onClick={() => setAktifFotoIndex(i)}
              aria-label={`${i + 1}. fotoğraf`}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i === aktifFotoIndex ? "bg-primary-600" : "bg-neutral-300"
              }`}
            />
          ))}
        </div>
      )}
      <div className="flex flex-1 flex-col gap-4 p-4">
        {magaza && (
          <div className="flex items-center justify-between gap-2">
            <Link
              href={`/magaza/${magaza.slug}`}
              className="min-w-0 truncate text-xs font-medium text-neutral-500 hover:text-primary-600"
            >
              {magaza.ad}
            </Link>
            <Link
              href={`/magaza/${magaza.slug}/yorumlar`}
              className="flex shrink-0 items-center gap-1 text-xs font-medium text-neutral-500 hover:text-primary-600"
            >
              <MagazaYildizi ortalama={magaza.degerlendirmeOrtalamasi ?? 0} sayi={magaza.degerlendirmeSayisi} />
              {magaza.degerlendirmeSayisi > 0 && magaza.degerlendirmeOrtalamasi!.toFixed(1)}
            </Link>
          </div>
        )}
        <button
          type="button"
          onClick={detayTikla}
          className="group w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-1"
        >
          <h3 className="line-clamp-2 font-bold text-neutral-900 transition-colors group-hover:text-primary-600">
            {urun.baslik}
          </h3>
        </button>
        <div className="flex items-baseline justify-between gap-1.5">
          <p className="text-lg font-semibold text-primary-700">{fiyatFormat.format(urun.fiyat)}</p>
          <span className="shrink-0 whitespace-nowrap text-xs text-neutral-500">{urun.stokAdedi} Adet</span>
        </div>
        <div className="mt-auto flex items-center gap-2">
          {urun.benimRezervasyonum ? (
            <RezervasyonDurumuButon rezervasyon={urun.benimRezervasyonum} />
          ) : (
            <button
              type="button"
              disabled={rezervasyonKapali}
              onClick={rezerveTikla}
              className={`flex-1 rounded-md px-3 py-1 text-xs font-semibold whitespace-nowrap transition-colors sm:text-sm ${
                rezervasyonKapali
                  ? "cursor-not-allowed bg-neutral-200 text-neutral-500"
                  : "bg-primary-500 text-white hover:bg-primary-600"
              }`}
            >
              {rezervasyonKapali ? (urun.beklemedeMi ? "Beklemede" : "Sıra kapandı") : "Rezerve Et"}
            </button>
          )}
          <span className="shrink-0 text-xs text-neutral-500 sm:hidden">
            R:{urun.aktifSayisi} Y:{urun.yedekSayisi}
          </span>
          <span className="hidden shrink-0 text-xs text-neutral-500 sm:inline">
            Rezerv: {urun.aktifSayisi} · Yedek: {urun.yedekSayisi}
          </span>
        </div>
        {/* Paylas butonlari mobilde tamamen kaldirildi - SADECE detay modalinda
            (UrunDetayModal, goresele/basliga tiklayinca acilir) erisilebilir.
            Masaustunde kartta aynen kalmaya devam ediyor. */}
        <div className="hidden sm:block">
          <PaylasButonlari
            baslik={urun.baslik}
            fiyat={urun.fiyat}
            urunLink={`/magaza/${magazaSlug}?urun=${urun.id}`}
            kapakFotoUrl={kapakFoto}
            tamGenislik
          />
        </div>
      </div>
      {modalAcik && (
        <RezerveModal
          urunId={urun.id}
          urunBaslik={urun.baslik}
          kullaniciTelefonVar={kullaniciTelefonVar}
          onClose={() => setModalAcik(false)}
        />
      )}
      {sikayetModalAcik && (
        <SikayetModal
          hedefTuru="urun"
          hedefId={urun.id}
          hedefAdi={urun.baslik}
          onClose={() => setSikayetModalAcik(false)}
        />
      )}
      {detayModalAcik && (
        <UrunDetayModal
          urun={urun}
          magaza={magaza}
          magazaSlug={magazaSlug}
          girisli={girisli}
          onClose={() => setDetayModalAcik(false)}
          onRezerveEt={detayRezerveEt}
          onSikayetEt={detaySikayetEt}
        />
      )}
    </div>
  );
}
